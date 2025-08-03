import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { emailService } from '@/services/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    
    // Check if user exists
    const { data: user } = await supabase
      .from('users')
      .select('id, email, first_name')
      .eq('email', email)
      .single();

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({ 
        message: 'If an account exists with this email, you will receive a password reset link.' 
      });
    }

    // Generate password reset token using Supabase
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    });

    if (error) {
      console.error('Error generating reset token:', error);
      return NextResponse.json({ error: 'Failed to generate reset link' }, { status: 500 });
    }

    // Get the reset link from Supabase response
    // Note: In production, Supabase sends the email automatically
    // We'll need to intercept this or use Supabase webhooks
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${data.properties?.action_link}`;

    // Send custom email via Mailgun
    const emailSent = await emailService.sendPasswordResetEmail({
      email: user.email,
      firstName: user.first_name,
      resetLink: resetLink,
      expiresIn: '1 hour',
    });

    if (!emailSent) {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'If an account exists with this email, you will receive a password reset link.' 
    });
  } catch (error) {
    console.error('Error in password reset:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}