import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

// Initialize Supabase client for logging
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export type AdminAction =
  | 'user.view'
  | 'user.update'
  | 'user.delete'
  | 'user.suspend'
  | 'user.activate'
  | 'user.impersonate'
  | 'user.export_data'
  | 'user.notify'
  | 'credits.add'
  | 'credits.remove'
  | 'credits.adjust'
  | 'subscription.change'
  | 'subscription.cancel'
  | 'analytics.view'
  | 'audit.view'
  | 'settings.update'
  | 'email.send'
  | 'email.campaign'
  | 'system.config'
  | 'security.alert';

export type ResourceType =
  | 'user'
  | 'profile'
  | 'subscription'
  | 'credits'
  | 'payment'
  | 'analytics'
  | 'settings'
  | 'email'
  | 'system';

interface LogOptions {
  adminId: string;
  adminEmail?: string;
  action: AdminAction;
  resourceType: ResourceType;
  resourceId?: string;
  details?: unknown;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}

/**
 * Log an admin action to the audit log
 */
export async function logAdminAction(options: LogOptions): Promise<void> {
  try {
    const {
      adminId,
      adminEmail,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress,
      userAgent,
      success = true,
      errorMessage,
    } = options;

    // Prepare the log entry
    const logEntry = {
      admin_id: adminId,
      admin_email: adminEmail,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details: details ? JSON.stringify(details) : null,
      ip_address: ipAddress,
      user_agent: userAgent,
      success,
      error_message: errorMessage,
      created_at: new Date().toISOString(),
    };

    // Insert into audit_logs table
    const { error } = await supabase.from('audit_logs').insert(logEntry);

    if (error) {
      console.error('Failed to write audit log:', error);
      // Don't throw - we don't want logging failures to break the app
    }
  } catch (error) {
    console.error('Error in logAdminAction:', error);
    // Silent fail - logging should not break functionality
  }
}

/**
 * Helper to extract IP address from request headers.
 * NEW-22: On platforms like Vercel, x-forwarded-for is
 * "client, proxy1, proxy2". The FIRST entry is the original client IP
 * appended by the first trusted reverse proxy. We trim and validate it.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const ip = forwarded.split(',')[0].trim();
    // Basic validation: must look like an IP (v4 or v6)
    if (/^[\d.:a-fA-F]+$/.test(ip)) {
      return ip;
    }
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp && /^[\d.:a-fA-F]+$/.test(realIp.trim())) {
    return realIp.trim();
  }

  // Fallback for development
  return '127.0.0.1';
}

/**
 * Helper to get user agent from request
 */
export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'Unknown';
}

/**
 * Batch log multiple actions (useful for bulk operations)
 */
export async function logAdminActionBatch(
  actions: LogOptions[]
): Promise<void> {
  try {
    const logEntries = actions.map(action => ({
      admin_id: action.adminId,
      admin_email: action.adminEmail,
      action: action.action,
      resource_type: action.resourceType,
      resource_id: action.resourceId,
      details: action.details ? JSON.stringify(action.details) : null,
      ip_address: action.ipAddress,
      user_agent: action.userAgent,
      success: action.success ?? true,
      error_message: action.errorMessage,
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('audit_logs').insert(logEntries);

    if (error) {
      console.error('Failed to write batch audit logs:', error);
    }
  } catch (error) {
    console.error('Error in logAdminActionBatch:', error);
  }
}

/**
 * Log a security-related admin action (high priority)
 */
export async function logSecurityAction(
  adminId: string,
  action: string,
  details: unknown,
  ipAddress?: string
): Promise<void> {
  await logAdminAction({
    adminId,
    action: 'security.alert',
    resourceType: 'system',
    details: {
      securityAction: action,
      ...details,
      timestamp: new Date().toISOString(),
    },
    ipAddress,
    success: true,
  });

  // For security actions, also log to console for immediate visibility
  console.warn(`[SECURITY ACTION] Admin ${adminId}: ${action}`, details);
}

/**
 * Create a middleware function for automatic logging
 */
export function createAdminLogger(
  action: AdminAction,
  resourceType: ResourceType
) {
  return async (
    request: Request,
    adminId: string,
    resourceId?: string,
    details?: unknown
  ) => {
    await logAdminAction({
      adminId,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });
  };
}
