import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { goHighLevelService } from '@/services/goHighLevel';
import { withRateLimit } from '@/lib/rate-limit';

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, phone } = body;

    // Validate required fields
    if (!email || !password || !firstName) {
      return NextResponse.json(
        { error: 'Email, password, and first name are required' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = await createServerSupabaseClient();

    // Sign up the user in Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          signup_source: 'dpi-tool'
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
      }
    });

    if (authError) {
      console.error('Supabase signup error:', authError);
      
      // Check if user already exists
      if (authError.message?.includes('already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in instead.' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: authError.message || 'Failed to create account' },
        { status: 400 }
      );
    }

    // After successful signup, also sign in the user to establish session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      console.error('Auto sign-in after signup failed:', signInError);
      // Don't fail the signup, just log the error
    }

    // Create contact in GoHighLevel (non-blocking)
    goHighLevelService.createContact({
      firstName,
      lastName,
      email,
      phone,
      source: 'DPI Tool Signup',
      tags: ['dpi-tool', 'free-account', 'website-signup'],
      customFields: {
        signupTool: 'DPI Checker',
        accountType: 'free'
      }
    }).then(result => {
      if (!result.success) {
        console.error('Failed to create GoHighLevel contact:', result.error);
      }
    }).catch(error => {
      console.error('Error creating GoHighLevel contact:', error);
    });

    // Return success with user data and session
    const response = NextResponse.json({
      success: true,
      user: authData.user,
      session: signInData?.session,
      message: 'Account created successfully! Check your email to verify your account.'
    });

    // If we have a session, set the auth cookies
    if (signInData?.session) {
      const { access_token, refresh_token } = signInData.session;
      
      // Set secure auth cookies
      response.cookies.set('sb-access-token', access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      });
      
      response.cookies.set('sb-refresh-token', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/'
      });
    }

    return response;

  } catch (error) {
    console.error('DPI tool signup error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'api');