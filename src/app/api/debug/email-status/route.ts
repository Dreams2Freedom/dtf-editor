import { NextResponse } from 'next/server';
import { emailService } from '@/services/email';
import { env, isFeatureAvailable } from '@/config/env';

export async function GET() {
  // Check email service configuration
  const status = {
    mailgunEnabled: isFeatureAvailable('mailgun'),
    hasMailgunApiKey: !!env.MAILGUN_API_KEY,
    hasMailgunDomain: !!env.MAILGUN_DOMAIN,
    mailgunApiKeyLength: env.MAILGUN_API_KEY?.length || 0,
    mailgunDomain: env.MAILGUN_DOMAIN || 'NOT SET',
    emailServiceEnabled: (emailService as any).enabled,
    fromEmail: env.MAILGUN_FROM_EMAIL || 'NOT SET',
    fromName: env.MAILGUN_FROM_NAME || 'NOT SET',
    nodeEnv: process.env.NODE_ENV,
    // Don't expose the actual API key, just check if it exists
    apiKeyFirstChars: env.MAILGUN_API_KEY?.substring(0, 10) || 'NOT SET',
  };

  console.log('Email Service Debug Status:', status);

  return NextResponse.json(status);
}