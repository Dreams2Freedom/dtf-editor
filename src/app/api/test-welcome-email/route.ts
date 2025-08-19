import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/services/email';
import { env } from '@/config/env';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    console.log('Test welcome email request for:', email);
    console.log('Mailgun config:', {
      domain: env.MAILGUN_DOMAIN,
      fromEmail: env.MAILGUN_FROM_EMAIL,
      fromName: env.MAILGUN_FROM_NAME,
      apiKeySet: !!env.MAILGUN_API_KEY,
    });

    // Test sending welcome email directly
    const sent = await emailService.sendWelcomeEmail({
      email: email || 'shannonherod@gmail.com',
      firstName: 'Shannon',
      planName: 'Free',
    });

    console.log('Email send result:', sent);

    return NextResponse.json({
      success: sent,
      message: sent ? 'Welcome email sent successfully' : 'Failed to send welcome email',
      config: {
        domain: env.MAILGUN_DOMAIN,
        fromEmail: env.MAILGUN_FROM_EMAIL,
        fromName: env.MAILGUN_FROM_NAME,
        apiKeySet: !!env.MAILGUN_API_KEY,
      }
    });
  } catch (error) {
    console.error('Test welcome email error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}