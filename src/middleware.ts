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
const getCSP = () => {
  const policy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://checkout.stripe.com https://clippingmagic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://api.stripe.com https://checkout.stripe.com https://*.supabase.co wss://*.supabase.co https://api.openai.com https://deep-image.ai https://clippingmagic.com https://*.clippingmagic.com https://api.vectorizer.ai https://api.mailgun.net",
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

  // Block access to debug/test endpoints in production
  if (process.env.NODE_ENV === 'production') {
    if (
      pathname.startsWith('/api/debug-') ||
      pathname.startsWith('/api/test-') ||
      pathname.startsWith('/test-') ||
      pathname.startsWith('/debug-')
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
