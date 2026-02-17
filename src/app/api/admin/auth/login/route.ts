import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/config/env';
import { logAdminAction, getClientIp, getUserAgent } from '@/utils/adminLogger';
import { withRateLimit } from '@/lib/rate-limit';
import { signCookieValue } from '@/lib/cookie-signing';

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, remember = false } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Handle cookie setting errors
            }
          },
        },
      }
    );

    // Authenticate user
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData.user) {
      // Log failed login attempt
      await logAdminAction({
        adminId: email,
        action: 'user.view' as any,
        resourceType: 'user',
        resourceId: email,
        details: {
          action: 'login_failed',
          reason: 'Invalid credentials',
        },
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
        success: false,
        errorMessage: 'Invalid email or password',
      });

      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is an admin in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, is_admin, is_active, created_at, updated_at')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile || !profile.is_admin) {
      // Not an admin, sign them out
      await supabase.auth.signOut();
      return NextResponse.json(
        { success: false, error: 'Access denied. Admin privileges required.' },
        { status: 403 }
      );
    }

    // NEW-08: Store only a signed user ID in the cookie, not the full session JSON.
    // The Supabase auth session is already managed via its own httpOnly cookies.
    // This admin_session cookie simply marks the user as a verified admin.
    const adminPermissions = {
      users: { view: true, edit: true, delete: true },
      financial: { view: true, refund: true, addCredits: true },
      system: { settings: true },
      analytics: { view: true },
      support: { view: true },
      admin: { manage: true },
    };

    // Update last activity
    await supabase
      .from('profiles')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', authData.user.id);

    // Log successful login
    await logAdminAction({
      adminId: authData.user.id,
      adminEmail: profile.email,
      action: 'user.view' as any,
      resourceType: 'user',
      resourceId: authData.user.id,
      details: {
        action: 'login_success',
        remember_me: remember,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      success: true,
    });

    // NEW-08: Minimal admin cookie — only signed user ID, not full session JSON
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
    };

    // Sign the user ID to prevent forgery
    const signedAdminId = signCookieValue(authData.user.id);
    cookieStore.set('admin_session', signedAdminId, cookieOptions);
    cookieStore.set('admin_logged_in', 'true', {
      ...cookieOptions,
      httpOnly: true,
    });

    // SEC-023/NEW-09: Return minimal data for UI rendering only.
    // Token is NOT included — Supabase auth cookies handle authentication.
    // Permissions returned here are for client UI rendering only;
    // actual enforcement is server-side via requireAdmin.
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: authData.user.id,
          email: profile.email,
          full_name: profile.full_name,
        },
        permissions: adminPermissions,
        requires_2fa: false,
      },
    });

    response.cookies.set('admin_session', signedAdminId, cookieOptions);

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'auth');
