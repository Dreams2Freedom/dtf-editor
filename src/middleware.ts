import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { env } from '@/config/env';
import { adminMiddleware } from '@/middleware/admin';
import { handleImpersonation } from '@/middleware/impersonation';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
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
  ],
};