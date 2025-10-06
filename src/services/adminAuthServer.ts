import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { AdminSession, AdminUserWithRole } from '@/types/admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * Verify admin session from request cookies (server-side)
 */
export async function verifyAdminSession(
  request: NextRequest
): Promise<AdminSession | null> {
  try {
    // Get session from cookie
    const sessionCookie = request.cookies.get('admin_session')?.value;

    if (!sessionCookie) {
      return null;
    }

    // Parse the session
    let adminSession: AdminSession;
    try {
      adminSession = JSON.parse(sessionCookie);
    } catch {
      return null;
    }

    // Verify the session is still valid
    if (!adminSession.user || !adminSession.token) {
      return null;
    }

    // Check if session is expired
    if (
      adminSession.expires_at &&
      new Date(adminSession.expires_at) < new Date()
    ) {
      return null;
    }

    // Verify user is still admin in database
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', adminSession.user.user_id)
      .single();

    if (error || !profile || !profile.is_admin) {
      return null;
    }

    return adminSession;
  } catch (error) {
    console.error('Session verification error:', error);
    return null;
  }
}

/**
 * Check if admin has specific permission (server-side)
 */
export function hasAdminPermission(
  session: AdminSession,
  permissionPath: string[]
): boolean {
  let current: any = session.user.role_permissions;

  for (const segment of permissionPath) {
    if (!current || typeof current !== 'object') {
      return false;
    }
    current = current[segment];
  }

  return current === true;
}

/**
 * Log admin action (server-side)
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  resourceType: string,
  resourceId: string | null,
  details: any,
  ipAddress: string
) {
  try {
    await supabase.from('admin_audit_logs').insert({
      admin_id: adminId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      ip_address: ipAddress,
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}
