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

// Content Security Policy
const getCSP = () => {
  const policy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com https://clippingmagic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https: http://localhost:*",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://api.stripe.com https://checkout.stripe.com https://*.supabase.co wss://*.supabase.co https://api.openai.com https://deep-image.ai https://clippingmagic.com https://*.clippingmagic.com https://api.vectorizer.ai https://api.mailgun.net http://localhost:*",
    "frame-src 'self' https://checkout.stripe.com https://js.stripe.com https://clippingmagic.com https://*.clippingmagic.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com https://clippingmagic.com https://*.clippingmagic.com",
    "frame-ancestors 'none'",
  ];
  
  return policy.join('; ');
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Block access to debug/test endpoints in production
  if (process.env.NODE_ENV === 'production') {
    if (pathname.startsWith('/api/debug-') || 
        pathname.startsWith('/api/test-') ||
        pathname.startsWith('/test-') ||
        pathname.startsWith('/debug-')) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
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

  const supabase = createServerClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    {
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
    }
  );

  // This will refresh the session if needed and update cookies
  const { data: { user } } = await supabase.auth.getUser();

  // Pass the session status to the request headers for debugging
  if (user) {
    response.headers.set('x-has-session', 'true');
  } else {
    response.headers.set('x-has-session', 'false');
  }

  // Apply security headers to all responses
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Add CSP header
  response.headers.set('Content-Security-Policy', getCSP());
  
  // Add HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Handle impersonation for all routes
  await handleImpersonation(request, response);

  return response;
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    // Admin routes
    '/admin/:path*',
    // Dashboard and app routes (for impersonation)
    '/dashboard/:path*',
    '/settings/:path*',
    '/process/:path*',
    // API routes that require authentication
    '/api/admin/:path*',
    '/api/process/:path*',
    '/api/stripe/:path*',
    '/api/users/:path*',
    '/api/generate/:path*',
  ],
};