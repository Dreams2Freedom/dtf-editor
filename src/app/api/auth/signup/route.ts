import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { emailService } from '@/services/email';
import { goHighLevelService } from '@/services/goHighLevel';
import { trackReferralSignup } from '@/services/affiliate';
import { env } from '@/config/env';

export async function POST(request: NextRequest) {
  console.log('[SIGNUP API] Step 1: Signup request received');
  
  try {
    const { email, password, metadata } = await request.json();

    // Check for affiliate cookie
    const affiliateCookie = request.cookies.get('dtf_ref')?.value;
    const affiliateCode = request.cookies.get('dtf_ref_code')?.value;
    
    console.log('[SIGNUP API] Step 2: Creating user for:', email);
    
    // Create Supabase client with service role for signup
    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Sign up the user
    const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: metadata || {},
    });
    
    if (signUpError) {
      console.error('[SIGNUP API] Step 3: Signup error:', signUpError);
      return NextResponse.json(
        { success: false, error: signUpError.message },
        { status: 400 }
      );
    }
    
    if (!signUpData.user) {
      console.error('[SIGNUP API] Step 3: No user created');
      return NextResponse.json(
        { success: false, error: 'Failed to create user' },
        { status: 500 }
      );
    }
    
    console.log('[SIGNUP API] Step 3: User created successfully:', signUpData.user.id);
    
    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: signUpData.user.id,
        email: signUpData.user.email,
        first_name: metadata?.firstName || '',
        last_name: metadata?.lastName || '',
        company: metadata?.company || '',
        created_at: new Date().toISOString(),
        credits_remaining: 2, // Free tier starts with 2 credits
        subscription_status: 'free',
        subscription_plan: 'free',
      });
    
    if (profileError) {
      console.error('[SIGNUP API] Step 4: Profile creation error:', profileError);
      // Don't fail signup if profile creation fails, it will be created on first login
    } else {
      console.log('[SIGNUP API] Step 4: Profile created successfully');
    }

    // Track referral if cookie exists
    if (affiliateCookie || affiliateCode) {
      console.log('[SIGNUP API] Step 4b: Tracking referral with cookie:', affiliateCookie, 'code:', affiliateCode);
      try {
        const referralResult = await trackReferralSignup(
          signUpData.user.id,
          affiliateCookie,
          affiliateCode
        );
        if (referralResult.success) {
          console.log('[SIGNUP API] Referral tracked successfully');
        } else {
          console.log('[SIGNUP API] Failed to track referral');
        }
      } catch (referralError) {
        console.error('[SIGNUP API] Error tracking referral:', referralError);
        // Don't fail signup if referral tracking fails
      }
    }

    // Send welcome email (this happens server-side, so it won't be cancelled)
    console.log('[SIGNUP API] Step 5: Sending welcome email to:', email);
    console.log('[SIGNUP API] Email metadata:', {
      email: email,
      firstName: metadata?.firstName || '',
      planName: 'Free',
    });
    
    try {
      console.log('[SIGNUP API] Calling emailService.sendWelcomeEmail...');
      const emailSent = await emailService.sendWelcomeEmail({
        email: email,
        firstName: metadata?.firstName || '',
        planName: 'Free',
      });
      
      console.log('[SIGNUP API] emailService.sendWelcomeEmail returned:', emailSent);
      
      if (emailSent) {
        console.log('[SIGNUP API] Step 6: Welcome email sent successfully');
      } else {
        console.error('[SIGNUP API] Step 6: Welcome email failed to send (returned false)');
      }
    } catch (emailError) {
      console.error('[SIGNUP API] Step 6: Welcome email error caught:', emailError);
      console.error('[SIGNUP API] Error stack:', (emailError as any)?.stack);
      // Don't fail signup if email fails
    }
    
    // Send admin notification for new signup
    console.log('[SIGNUP API] Step 6b: Sending admin notification for new signup');
    try {
      await emailService.sendAdminNotification({
        type: 'new_signup',
        userEmail: email,
        userName: `${metadata?.firstName || ''} ${metadata?.lastName || ''}`.trim() || undefined,
        details: {
          company: metadata?.company || 'Not provided',
          plan: 'Free',
          initial_credits: 2,
          signup_method: 'Email/Password',
        },
        timestamp: new Date().toISOString(),
      });
      console.log('[SIGNUP API] Admin notification sent successfully');
    } catch (adminEmailError) {
      console.error('[SIGNUP API] Admin notification error:', adminEmailError);
      // Don't fail signup if admin notification fails
    }
    
    // Create contact in GoHighLevel (non-blocking)
    console.log('[SIGNUP API] Step 6c: Creating GoHighLevel contact');
    goHighLevelService.createContact({
      firstName: metadata?.firstName || '',
      lastName: metadata?.lastName || '',
      email: email,
      phone: metadata?.phone || '',
      source: 'DTF Editor Signup',
      tags: ['dtf-tool-signup', 'website-lead', 'free-account'],
      customFields: {
        company: metadata?.company || '',
        signupDate: new Date().toISOString(),
        accountType: 'free',
        initialCredits: 2
      }
    }).then(result => {
      if (result.success) {
        console.log('[SIGNUP API] GoHighLevel contact created successfully');
      } else {
        console.error('[SIGNUP API] Failed to create GoHighLevel contact:', result.error);
      }
    }).catch(error => {
      console.error('[SIGNUP API] Error creating GoHighLevel contact:', error);
    });
    
    // Sign in the user to create a session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (signInError) {
      console.error('[SIGNUP API] Step 7: Auto sign-in error:', signInError);
      // User was created but couldn't sign in automatically
      return NextResponse.json({
        success: true,
        user: signUpData.user,
        session: null,
        message: 'Account created successfully. Please sign in.',
      });
    }
    
    console.log('[SIGNUP API] Step 7: User signed in successfully');
    
    return NextResponse.json({
      success: true,
      user: signInData.user,
      session: signInData.session,
    });
    
  } catch (error) {
    console.error('[SIGNUP API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}