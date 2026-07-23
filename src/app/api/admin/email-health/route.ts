import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { emailService } from '@/services/email';
import { withRateLimit } from '@/lib/rate-limit';
import { env } from '@/config/env';

/**
 * Admin email-health endpoint.
 *
 * GET  -> reports whether Mailgun is configured (region/domain/from), so the
 *         "no emails are sending" failure mode is diagnosable from the live app
 *         instead of guessing at env vars.
 * POST -> sends a real welcome test email to a given address to prove delivery
 *         end-to-end. Body: { "email": "you@example.com" }
 *
 * Both routes require an authenticated admin (profiles.is_admin = true).
 */

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  return { user };
}

async function handleGet() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const status = emailService.getConfigStatus();
  return NextResponse.json({
    ...status,
    // Resolved base URL used for links in transactional emails — should be an
    // absolute https URL (e.g. https://dtfeditor.com). If this shows http:// or
    // a wrong host, email links will render as "not secure".
    appUrl: env.APP_URL,
    appUrlSecure: /^https:\/\//i.test(env.APP_URL),
    message: status.configured
      ? `Mailgun is configured (region=${status.region}, domain=${status.domain}). Emails should send.`
      : 'Mailgun is NOT configured — set MAILGUN_API_KEY and MAILGUN_DOMAIN in the environment. No emails will be sent until this is fixed.',
  });
}

async function handlePost(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  let email: string | undefined;
  try {
    const body = await request.json();
    email = body?.email;
  } catch {
    // ignore — handled by validation below
  }

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json(
      { error: 'A valid "email" address is required in the request body.' },
      { status: 400 }
    );
  }

  const status = emailService.getConfigStatus();
  if (!status.configured) {
    return NextResponse.json(
      {
        sent: false,
        configured: false,
        error:
          'Mailgun is not configured — cannot send test email. Set MAILGUN_API_KEY and MAILGUN_DOMAIN first.',
      },
      { status: 503 }
    );
  }

  const sent = await emailService.sendWelcomeEmail({
    email,
    firstName: 'Admin Test',
    planName: 'Free',
  });

  return NextResponse.json(
    {
      sent,
      configured: true,
      region: status.region,
      domain: status.domain,
      from: status.fromEmail,
      message: sent
        ? `Test email dispatched to ${email}. Check the inbox (and spam) and the Mailgun logs.`
        : `Mailgun accepted the request but reported a failure sending to ${email}. Check server logs for the Mailgun API error (likely a bad key, unverified domain, or wrong region).`,
    },
    { status: sent ? 200 : 502 }
  );
}

export const GET = withRateLimit(handleGet, 'admin');
export const POST = withRateLimit(handlePost, 'admin');
