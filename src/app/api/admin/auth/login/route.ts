import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/config/env';
import { logAdminAction, getClientIp, getUserAgent } from '@/utils/adminLogger';
import { withRateLimit } from '@/lib/rate-limit';

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
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
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
          reason: authError?.message || 'Invalid credentials'
        },
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
        success: false,
        errorMessage: 'Invalid email or password'
      });
      
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is an admin in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
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

    // Create simplified admin session data
    const adminSession = {
      user: {
        id: authData.user.id,
        user_id: authData.user.id,
        role_id: 'admin',
        role_name: 'admin',
        role_permissions: {
          users: { view: true, edit: true, delete: true },
          financial: { view: true, refund: true, addCredits: true },
          system: { settings: true },
          analytics: { view: true },
          support: { view: true },
          admin: { manage: true }
        },
        user_email: profile.email,
        user_full_name: profile.full_name,
        two_factor_enabled: false,
        ip_whitelist: [],
        last_login_at: new Date().toISOString(),
        created_at: profile.created_at,
        updated_at: profile.updated_at
      },
      token: authData.session.access_token,
      expires_at: authData.session.expires_at || '',
      requires_2fa: false // Always false for now, will be configurable later
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
        ip: getClientIp(request)
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      success: true
    });

    // Set admin session cookie first
    const cookieOptions = {
      httpOnly: false, // Changed to allow JS access for debugging
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60 // 30 days if remember me, 1 day otherwise
    };

    // Set cookie using the cookies() function
    cookieStore.set('admin_session', JSON.stringify(adminSession), cookieOptions);
    
    // Also set a simple flag cookie for middleware
    cookieStore.set('admin_logged_in', 'true', {
      ...cookieOptions,
      httpOnly: true // This one can be httpOnly
    });

    // Also set Supabase auth cookies properly
    const supabaseAuthCookies = await supabase.auth.getSession();
    if (supabaseAuthCookies.data.session) {
      // Ensure Supabase cookies are also set
      cookieStore.set('sb-auth-token', supabaseAuthCookies.data.session.access_token, {
        ...cookieOptions,
        httpOnly: false // Supabase needs to read this client-side
      });
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      data: {
        session: adminSession,
        requires_2fa: false,
        cookieSet: true // Debug flag
      }
    });

    // Double-check by also setting on response
    response.cookies.set('admin_session', JSON.stringify(adminSession), cookieOptions);

    // Add debug headers
    response.headers.set('X-Admin-Login', 'success');
    response.headers.set('X-Cookie-Set', 'true');

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'admin');