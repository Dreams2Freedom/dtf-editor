import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import {
  logAdminAction,
  logSecurityAction,
  getClientIp,
  getUserAgent,
} from '@/utils/adminLogger';
import { withRateLimit } from '@/lib/rate-limit';
import { signCookieValue } from '@/lib/cookie-signing';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const supabase = await createServerSupabaseClient();

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin, email')
      .eq('id', user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Use service role client to access other users' data
    const serviceSupabase = createServiceRoleClient();

    // Get target user details
    const { data: targetUser } = await serviceSupabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', id)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Don't allow impersonating other admins
    const { data: targetProfile } = await serviceSupabase
      .from('profiles')
      .select('is_admin')
      .eq('id', id)
      .single();

    if (targetProfile?.is_admin) {
      return NextResponse.json(
        { error: 'Cannot impersonate other administrators' },
        { status: 403 }
      );
    }

    // Create impersonation session data
    const impersonationData = {
      originalAdminId: user.id,
      originalAdminEmail: adminProfile.email,
      impersonatedUserId: targetUser.id,
      impersonatedUserEmail: targetUser.email,
      startedAt: new Date().toISOString(),
    };

    // SEC-009: Store HMAC-signed impersonation data in a secure httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set(
      'impersonation_session',
      await signCookieValue(JSON.stringify(impersonationData)),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 2, // 2 hours max impersonation session
        path: '/',
      }
    );

    // Set a cookie to override the user authentication
    // This will be checked by our auth middleware
    cookieStore.set('supabase-auth-override', targetUser.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 2, // 2 hours max impersonation session
      path: '/',
    });

    // Log the impersonation action with security priority
    await logSecurityAction(
      user.id,
      'user_impersonation_started',
      {
        target_user_id: id,
        target_user_email: targetUser.email,
        target_user_name: targetUser.full_name,
        admin_email: adminProfile.email,
      },
      getClientIp(request)
    );

    // Also log as regular admin action
    await logAdminAction({
      adminId: user.id,
      adminEmail: user.email,
      action: 'user.impersonate',
      resourceType: 'user',
      resourceId: id,
      details: {
        target_user_email: targetUser.email,
        session_duration: '2 hours max',
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({
      success: true,
      impersonatedUser: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.full_name,
      },
      message: `Now viewing as ${targetUser.email}. Your admin session is preserved.`,
    });
  } catch (error) {
    console.error('Error starting impersonation:', error);
    return NextResponse.json(
      { error: 'Failed to start impersonation' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const cookieStore = await cookies();

    // Get impersonation session
    const impersonationCookie = cookieStore.get('impersonation_session');
    if (!impersonationCookie) {
      return NextResponse.json(
        { error: 'No active impersonation session' },
        { status: 400 }
      );
    }

    const impersonationData = JSON.parse(impersonationCookie.value);

    // Log the end of impersonation
    await supabase.from('admin_audit_logs').insert({
      admin_id: impersonationData.originalAdminId,
      action: 'user_impersonation_ended',
      resource_type: 'user',
      resource_id: impersonationData.impersonatedUserId,
      details: {
        duration_seconds: Math.floor(
          (Date.now() - new Date(impersonationData.startedAt).getTime()) / 1000
        ),
        target_user_email: impersonationData.impersonatedUserEmail,
      },
      ip_address:
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip'),
      user_agent: request.headers.get('user-agent'),
    });

    // Clear impersonation cookie
    cookieStore.delete('impersonation_session');

    return NextResponse.json({
      success: true,
      message: 'Impersonation session ended',
    });
  } catch (error) {
    console.error('Error ending impersonation:', error);
    return NextResponse.json(
      { error: 'Failed to end impersonation' },
      { status: 500 }
    );
  }
}
