import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { env } from '@/config/env';

// Admin route protection middleware
export async function adminMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow access to login pages
  if (pathname.startsWith('/admin/login')) {
    return NextResponse.next();
  }

  // Create response object
  let response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  });

  // Create Supabase client
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

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    // Not an admin, redirect to regular dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // User is authenticated and is admin, allow access
  response.headers.set('x-user-id', user.id);
  response.headers.set('x-is-admin', 'true');

  return response;
}
