import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { env } from '@/config/env';
import { adminMiddleware } from '@/middleware/admin';
import { handleImpersonation } from '@/middleware/impersonation';

// Security headers to apply to all responses
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// SEC-031: Content Security Policy — removed unsafe-eval.
// unsafe-inline is still required for Next.js inline styles and Stripe.js;
// a full nonce-based CSP requires custom Next.js Document integration.
//
// Meta (Facebook) Pixel: connect.facebook.net is allowlisted in script-src so
// fbevents.js can load, and connect.facebook.net + www.facebook.com in
// connect-src so the pixel can send events to https://www.facebook.com/tr.
// Without these, the browser blocks the pixel and Meta can't detect it.
const getCSP = () => {
  const policy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://checkout.stripe.com https://clippingmagic.com https://connect.facebook.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://api.stripe.com https://checkout.stripe.com https://*.supabase.co wss://*.supabase.co https://api.openai.com https://deep-image.ai https://clippingmagic.com https://*.clippingmagic.com https://api.vectorizer.ai https://api.mailgun.net https://connect.facebook.net https://www.facebook.com",
    "frame-src 'self' https://checkout.stripe.com https://js.stripe.com https://clippingmagic.com https://*.clippingmagic.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com https://clippingmagic.com https://*.clippingmagic.com",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];

  return policy.join('; ');
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for webhook routes — they need raw body access
  // and have their own auth (Stripe signature verification)
  if (pathname.startsWith('/api/webhooks/')) {
    return NextResponse.next();
  }

  // Block access to debug/test endpoints in production
  if (process.env.NODE_ENV === 'production') {
    if (
      pathname.startsWith('/api/debug-') ||
      pathname.startsWith('/api/test-') ||
      pathname.startsWith('/test-') ||
      pathname.startsWith('/debug-') ||
      // Throwaway dev/debug pages that don't match the prefixes above
      pathname.startsWith('/auth-debug') ||
      pathname.startsWith('/process-test') ||
      pathname.startsWith('/simple') ||
      pathname === '/test' ||
      pathname.startsWith('/test/')
    ) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
  }

  // Handle admin routes
  if (pathname.startsWith('/admin')) {
    return await adminMiddleware(request);
  }

  // Create a response object that we can modify
  let response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  });

  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // This will refresh the session if needed and update cookies
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Email-verification gate: NEW users must verify their email before they can
  // reach the dashboard or use any tool. This stops people signing up with fake
  // emails just to consume free credits.
  //
  // Grandfathering is automatic: every pre-existing account already has
  // `email_confirmed_at` set (signups used to be auto-confirmed), so existing
  // users — paid or free — always pass this check. Only a logged-in user whose
  // email is genuinely unconfirmed (i.e. a new signup that hasn't clicked the
  // link) is blocked. No cutoff date or data migration required.
  if (user && !user.email_confirmed_at) {
    const GATED_PAGES = ['/dashboard', '/studio', '/generate', '/process'];
    // Credit-consuming / processing endpoints — blocked so the gate can't be
    // bypassed by scripting the API directly.
    const GATED_APIS = [
      '/api/generate',
      '/api/upscale',
      '/api/upscale-async',
      '/api/clippingmagic',
      '/api/process',
      '/api/analyze',
      '/api/upload',
      '/api/uploads',
      '/api/credits/deduct',
      '/api/jobs',
    ];

    const matches = (prefix: string) =>
      pathname === prefix || pathname.startsWith(prefix + '/');

    if (GATED_APIS.some(matches)) {
      return NextResponse.json(
        {
          error: 'Please verify your email to use this feature.',
          code: 'email_unverified',
        },
        { status: 403 }
      );
    }

    if (GATED_PAGES.some(matches)) {
      const url = new URL('/verify-email', request.url);
      if (user.email) url.searchParams.set('email', user.email);
      return NextResponse.redirect(url);
    }
  }

  // NEW-16: Block paid-feature access for users with past-due subscriptions.
  // Processing routes require an active subscription; past_due users are
  // redirected to their billing page to update payment.
  if (user && pathname.startsWith('/process/')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_status === 'past_due') {
      return NextResponse.redirect(new URL('/settings?tab=billing&reason=past_due', request.url));
    }
  }

  // Apply security headers to all responses
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add CSP header
  response.headers.set('Content-Security-Policy', getCSP());

  // Add HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  // Handle impersonation for all routes
  await handleImpersonation(request, response);

  return response;
}

// SEC-033: Expanded middleware matcher to cover all application routes
// for security headers (CSP, HSTS, etc.) and session refresh.
export const config = {
  matcher: [
    // Match all routes EXCEPT static assets, images, and Next.js internals
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot|css|js|map)).*)',
  ],
};
