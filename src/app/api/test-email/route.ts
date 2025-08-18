import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/services/email';
import { env } from '@/config/env';

export async function GET(request: NextRequest) {
  // Check if Mailgun is configured
  const mailgunConfigured = !!(env.MAILGUN_API_KEY && env.MAILGUN_DOMAIN);
  
  return NextResponse.json({
    mailgunConfigured,
    mailgunDomain: env.MAILGUN_DOMAIN || 'not set',
    fromEmail: env.MAILGUN_FROM_EMAIL || 'not set',
    fromName: env.MAILGUN_FROM_NAME || 'not set',
    apiKeySet: !!env.MAILGUN_API_KEY
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Send test welcome email
    const sent = await emailService.sendWelcomeEmail({
      email,
      firstName: 'Test User',
      planName: 'Free'
    });

    if (sent) {
      return NextResponse.json({
        success: true,
        message: `Test welcome email sent to ${email}`
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to send email. Check server logs for details.'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}