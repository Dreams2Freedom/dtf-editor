import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

// SEC-036: Cache admin status for 60 seconds (reduced from 5 minutes)
// to limit the window where a revoked admin retains cached access.
const adminCache = new Map<string, { isAdmin: boolean; expiresAt: number }>();
const CACHE_DURATION = 60 * 1000; // 60 seconds

/**
 * Verify user authentication
 * Returns user object if authenticated, null otherwise
 */
export async function verifyAuth(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
}

/**
 * Verify admin authorization
 * Returns true if user is admin, false otherwise
 */
export async function verifyAdmin(userId: string): Promise<boolean> {
  try {
    // Check cache first
    const cached = adminCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.isAdmin;
    }

    const supabase = await createServerSupabaseClient();

    // NEW-26: Check both is_admin AND is_active to block disabled admins
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_admin, is_active')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      console.error('Admin verification error:', error);
      return false;
    }

    const isValidAdmin =
      profile.is_admin === true && profile.is_active !== false;

    // Cache the result
    adminCache.set(userId, {
      isAdmin: isValidAdmin,
      expiresAt: Date.now() + CACHE_DURATION,
    });

    return isValidAdmin;
  } catch (error) {
    console.error('Admin verification error:', error);
    return false;
  }
}

/**
 * Authentication middleware
 * Ensures user is authenticated
 */
export async function requireAuth(
  request: NextRequest
): Promise<NextResponse | null> {
  const user = await verifyAuth(request);

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Add user ID to headers for rate limiting
  request.headers.set('x-user-id', user.id);

  return null;
}

/**
 * Admin authorization middleware
 * Ensures user is authenticated AND is an admin
 */
export async function requireAdmin(
  request: NextRequest
): Promise<NextResponse | null> {
  const user = await verifyAuth(request);

  if (!user) {
    console.error('requireAdmin: No authenticated user');
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  console.log('requireAdmin: Checking admin status for user:', user.id);
  const isAdmin = await verifyAdmin(user.id);
  console.log('requireAdmin: isAdmin result:', isAdmin);

  if (!isAdmin) {
    // Log unauthorized admin access attempts
    console.warn(
      `Unauthorized admin access attempt by user ID: ${user.id}`
    );

    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  // Add user ID to headers for rate limiting
  request.headers.set('x-user-id', user.id);
  request.headers.set('x-is-admin', 'true');

  return null;
}

/**
 * Wrapper to create authenticated API route handler
 */
export function withAuth(
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return handler(request, user);
  };
}

/**
 * Wrapper to create admin-only API route handler
 */
export function withAdmin(
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const isAdmin = await verifyAdmin(user.id);

    if (!isAdmin) {
      console.warn(
        `Unauthorized admin access attempt by user ID: ${user.id}`
      );
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return handler(request, user);
  };
}

/**
 * Security headers middleware
 * Adds security headers to all responses
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  // Only add HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  // Content Security Policy (adjust as needed)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.stripe.com https://checkout.stripe.com https://*.supabase.co wss://*.supabase.co https://api.openai.com https://deep-image.ai https://clippingmagic.com https://api.vectorizer.ai",
    "frame-src 'self' https://checkout.stripe.com https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  return response;
}
