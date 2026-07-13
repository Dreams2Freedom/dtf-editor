import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { emailService } from '@/services/email';
import { env } from '@/config/env';
import { withRateLimit } from '@/lib/rate-limit';
import { getTrustedBaseUrl } from '@/lib/auth/request-base-url';

/**
 * Resend the email-verification link for an unverified account.
 *
 * Uses a magic-link token (works for an already-created, unconfirmed user —
 * we don't have their password here) and delivers it via Mailgun to our own
 * /auth/confirm route. Verifying it confirms their email and signs them in.
 *
 * Returns a generic success regardless of whether the account exists or is
 * already verified, to avoid leaking which emails are registered.
 */
async function handlePost(request: NextRequest) {
  const GENERIC_OK = NextResponse.json({
    success: true,
    message:
      'If an unverified account exists for that email, a new verification link is on its way.',
  });

  try {
    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Look up the account by email (service role bypasses RLS).
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, first_name')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (!profile?.id) {
      // Don't reveal that the account doesn't exist.
      return GENERIC_OK;
    }

    // If the email is already confirmed, there's nothing to resend.
    const { data: userData } = await supabase.auth.admin.getUserById(
      profile.id
    );
    if (userData?.user?.email_confirmed_at) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: 'This email is already verified. You can sign in.',
      });
    }

    // Generate a fresh confirmation token and email it via Mailgun.
    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });

    if (linkError || !linkData.properties?.hashed_token) {
      console.error('[RESEND VERIFY] generateLink failed:', linkError?.message);
      return GENERIC_OK;
    }

    const confirmationLink = `${getTrustedBaseUrl(
      request
    )}/auth/confirm?token_hash=${encodeURIComponent(
      linkData.properties.hashed_token
    )}&type=magiclink`;

    try {
      await emailService.sendEmailConfirmation({
        email,
        firstName: profile.first_name || '',
        confirmationLink,
      });
    } catch (emailError) {
      console.error('[RESEND VERIFY] Email send failed:', emailError);
    }

    return GENERIC_OK;
  } catch (error) {
    console.error('[RESEND VERIFY] Unexpected error:', error);
    return GENERIC_OK;
  }
}

export const POST = withRateLimit(handlePost, 'auth');
