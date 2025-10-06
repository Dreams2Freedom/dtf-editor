import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Admin2FAVerifyRequest, AdminSession } from '@/types/admin';
import { withRateLimit } from '@/lib/rate-limit';

// Simple TOTP implementation for development
// In production, use a library like speakeasy or otpauth
function verifyTOTP(secret: string, token: string): boolean {
  // For development, we'll use a simple verification
  // In production, implement proper TOTP algorithm
  if (process.env.NODE_ENV === 'development') {
    // Accept a test code in development
    return token === '123456' || token === secret.substring(0, 6);
  }

  // Placeholder for production TOTP verification
  // TODO: Implement proper TOTP verification
  return false;
}

async function handlePost(request: NextRequest) {
  try {
    const body: Admin2FAVerifyRequest = await request.json();
    const { code } = body;

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Get admin session from cookie
    const sessionCookie = cookies().get('admin_session');
    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: 'No active session' },
        { status: 401 }
      );
    }

    const session: AdminSession = JSON.parse(sessionCookie.value);

    if (!session.requires_2fa) {
      return NextResponse.json(
        { success: false, error: '2FA not required for this session' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get admin user with 2FA secret
    const { data: adminUser, error } = await supabase
      .from('admin_users')
      .select('id, two_factor_secret')
      .eq('id', session.user.id)
      .single();

    if (error || !adminUser) {
      return NextResponse.json(
        { success: false, error: '2FA not configured' },
        { status: 400 }
      );
    }

    // For development, if no secret is set, accept test code
    const secret = adminUser.two_factor_secret || 'DEVELOPMENT_SECRET';

    // Verify TOTP code
    const verified = verifyTOTP(secret, code);

    if (!verified) {
      // Log failed 2FA attempt
      await supabase.rpc('log_admin_action', {
        p_admin_id: adminUser.id,
        p_action: 'admin.2fa_failed',
        p_resource_type: 'admin_user',
        p_resource_id: adminUser.id,
        p_details: { reason: 'Invalid code' },
      });

      return NextResponse.json(
        { success: false, error: 'Invalid verification code' },
        { status: 401 }
      );
    }

    // Update session to mark 2FA as verified
    session.requires_2fa = false;

    // Log successful 2FA
    await supabase.rpc('log_admin_action', {
      p_admin_id: adminUser.id,
      p_action: 'admin.2fa_success',
      p_resource_type: 'admin_user',
      p_resource_id: adminUser.id,
    });

    // Update session cookie
    const response = NextResponse.json({
      success: true,
      data: { session },
    });

    response.cookies.set('admin_session', JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'admin');
