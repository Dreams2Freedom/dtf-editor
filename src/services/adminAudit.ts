import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { AdminSession } from '@/types/admin';

export type AuditAction = 
  | 'admin.login'
  | 'admin.logout'
  | 'admin.login_failed'
  | 'admin.2fa_verified'
  | 'admin.2fa_failed'
  | 'user.view'
  | 'user.list'
  | 'user.update'
  | 'user.delete'
  | 'user.export'
  | 'user.impersonate'
  | 'user.stop_impersonate'
  | 'user.credits_add'
  | 'user.credits_remove'
  | 'user.bulk_update'
  | 'user.bulk_credits'
  | 'user.status_change'
  | 'user.subscription_cancel'
  | 'email.send'
  | 'email.bulk_send'
  | 'notification.send'
  | 'stats.view'
  | 'analytics.view'
  | 'revenue.view'
  | 'logs.view'
  | 'support.view'
  | 'support.reply'
  | 'support.close'
  | 'settings.update';

export type ResourceType = 
  | 'user'
  | 'admin'
  | 'subscription'
  | 'email'
  | 'notification'
  | 'system'
  | 'analytics'
  | 'support_ticket'
  | 'settings';

interface AuditLogEntry {
  action: AuditAction;
  resource_type: ResourceType;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string | null;
  user_agent?: string | null;
}

export class AdminAuditService {
  private static instance: AdminAuditService;

  private constructor() {}

  static getInstance(): AdminAuditService {
    if (!AdminAuditService.instance) {
      AdminAuditService.instance = new AdminAuditService();
    }
    return AdminAuditService.instance;
  }

  /**
   * Log an admin action to the audit trail
   */
  async logAction(
    adminSession: AdminSession | null,
    entry: AuditLogEntry,
    request?: Request
  ): Promise<boolean> {
    try {
      // If no admin session, we can't log (unless it's a login attempt)
      if (!adminSession && entry.action !== 'admin.login_failed') {
        console.warn('No admin session for audit log:', entry.action);
        return false;
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

      // Extract IP and user agent from request if provided
      let ipAddress = entry.ip_address;
      let userAgent = entry.user_agent;
      
      if (request) {
        ipAddress = ipAddress || 
          request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
          request.headers.get('x-real-ip') ||
          null;
        userAgent = userAgent || request.headers.get('user-agent');
      }

      // Prepare the log entry
      const logEntry = {
        admin_id: adminSession?.user?.id || entry.details?.attempted_email || 'unknown',
        action: entry.action,
        resource_type: entry.resource_type,
        resource_id: entry.resource_id || null,
        details: entry.details || {},
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: new Date().toISOString()
      };

      // Insert directly into audit_logs table
      const { error } = await supabase
        .from('audit_logs')
        .insert(logEntry);

      if (error) {
        console.error('Failed to write audit log:', error);
        return false;
      }

      // Also log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Admin Audit:', {
          action: entry.action,
          admin: adminSession?.user?.email || 'unknown',
          resource: `${entry.resource_type}${entry.resource_id ? `/${entry.resource_id}` : ''}`,
          details: entry.details
        });
      }

      return true;
    } catch (error) {
      console.error('Audit logging error:', error);
      return false;
    }
  }

  /**
   * Helper to log user-related actions
   */
  async logUserAction(
    adminSession: AdminSession,
    action: Extract<AuditAction, `user.${string}`>,
    userId: string,
    details?: Record<string, any>,
    request?: Request
  ): Promise<boolean> {
    return this.logAction(adminSession, {
      action,
      resource_type: 'user',
      resource_id: userId,
      details
    }, request);
  }

  /**
   * Helper to log login attempts
   */
  async logLoginAttempt(
    success: boolean,
    email: string,
    details?: Record<string, any>,
    request?: Request
  ): Promise<boolean> {
    return this.logAction(null, {
      action: success ? 'admin.login' : 'admin.login_failed',
      resource_type: 'admin',
      resource_id: email,
      details: {
        ...details,
        attempted_email: email,
        success
      }
    }, request);
  }

  /**
   * Helper to log bulk operations
   */
  async logBulkOperation(
    adminSession: AdminSession,
    action: AuditAction,
    affectedIds: string[],
    details?: Record<string, any>,
    request?: Request
  ): Promise<boolean> {
    return this.logAction(adminSession, {
      action,
      resource_type: 'user',
      resource_id: `bulk_${affectedIds.length}_users`,
      details: {
        ...details,
        affected_count: affectedIds.length,
        affected_ids: affectedIds.slice(0, 10), // Log first 10 IDs
        total_affected: affectedIds.length
      }
    }, request);
  }

  /**
   * Helper to format common detail objects
   */
  formatUpdateDetails(
    before: Record<string, any>,
    after: Record<string, any>
  ): Record<string, any> {
    const changes: Record<string, any> = {};
    
    for (const key in after) {
      if (before[key] !== after[key]) {
        changes[key] = {
          before: before[key],
          after: after[key]
        };
      }
    }
    
    return {
      changes,
      fields_changed: Object.keys(changes)
    };
  }
}

// Export singleton instance
export const adminAudit = AdminAuditService.getInstance();

/**
 * Simple helper function for creating audit logs
 * Used in API routes where we have basic parameters
 */
export async function createAdminAuditLog(params: {
  admin_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
}) {
  try {
    const { createServiceRoleClient } = await import('@/lib/supabase/server');
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        admin_id: params.admin_id,
        action: params.action,
        resource_type: params.resource_type,
        resource_id: params.resource_id || null,
        details: params.details || {},
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('[AUDIT] Failed to create audit log:', error);
      return false;
    }

    console.log('[AUDIT] Logged action:', params.action, 'by', params.admin_id);
    return true;
  } catch (error) {
    console.error('[AUDIT] Error creating audit log:', error);
    return false;
  }
}