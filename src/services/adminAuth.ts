import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/config/env';
import type { 
  AdminSession, 
  AdminLoginRequest, 
  AdminLoginResponse,
  Admin2FAVerifyRequest,
  AdminUserWithRole,
  AdminApiResponse
} from '@/types/admin';

class AdminAuthService {
  private supabase;

  constructor() {
    this.supabase = createBrowserClient(
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY
    );
  }

  /**
   * Admin login - separate from regular user login
   */
  async login({ email, password, remember = false }: AdminLoginRequest): Promise<AdminApiResponse<AdminLoginResponse>> {
    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, remember }),
        credentials: 'include', // Important for cookies
      });

      const result = await response.json();

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Login failed'
        };
      }

      // Store admin session in local storage
      if (result.data && result.data.session) {
        if (remember) {
          localStorage.setItem('admin_session', JSON.stringify(result.data.session));
        } else {
          sessionStorage.setItem('admin_session', JSON.stringify(result.data.session));
        }
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'An error occurred during login'
      };
    }
  }

  /**
   * Verify 2FA code
   */
  async verify2FA({ code, session_token }: Admin2FAVerifyRequest): Promise<AdminApiResponse<AdminSession>> {
    try {
      // Verify TOTP code against stored secret
      const response = await fetch('/api/admin/auth/2fa-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session_token}`
        },
        body: JSON.stringify({ code })
      });

      const result = await response.json();

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Invalid 2FA code'
        };
      }

      // Update session
      const session = result.data.session;
      const storage = localStorage.getItem('admin_session') ? localStorage : sessionStorage;
      storage.setItem('admin_session', JSON.stringify(session));

      return {
        success: true,
        data: session
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to verify 2FA code'
      };
    }
  }

  /**
   * Get current admin session
   */
  getSession(): AdminSession | null {
    const stored = localStorage.getItem('admin_session') || sessionStorage.getItem('admin_session');
    if (!stored) return null;

    try {
      const session = JSON.parse(stored) as AdminSession;
      
      // Check if session is expired
      if (new Date(session.expires_at) < new Date()) {
        this.clearSession();
        return null;
      }

      return session;
    } catch {
      return null;
    }
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permissionPath: string[]): boolean {
    const session = this.getSession();
    if (!session) return false;

    let current: any = session.user.role_permissions;
    
    for (const segment of permissionPath) {
      if (!current || typeof current !== 'object') return false;
      current = current[segment];
    }

    return current === true;
  }

  /**
   * Logout admin
   */
  async logout(): Promise<void> {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
    } catch (error) {
    }

    // Clear admin session
    this.clearSession();
  }

  /**
   * Clear admin session
   */
  private clearSession(): void {
    localStorage.removeItem('admin_session');
    sessionStorage.removeItem('admin_session');
  }

  /**
   * Log admin action for audit trail
   */
  private async logAdminAction(
    action: string, 
    resourceType: string, 
    resourceId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      const session = this.getSession();
      if (!session) return;

      await fetch('/api/admin/audit/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        },
        body: JSON.stringify({
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          details
        })
      });
    } catch (error) {
    }
  }

  /**
   * Setup 2FA for admin account
   */
  async setup2FA(): Promise<AdminApiResponse<{ qrCode: string; secret: string }>> {
    try {
      const session = this.getSession();
      if (!session) {
        return {
          success: false,
          error: 'No active session'
        };
      }

      const response = await fetch('/api/admin/auth/2fa-setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.token}`
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'Failed to setup 2FA'
      };
    }
  }

  /**
   * Check if current IP is whitelisted
   */
  async checkIPWhitelist(): Promise<boolean> {
    const session = this.getSession();
    if (!session) return false;

    // If no whitelist configured, allow all
    if (!session.user.ip_whitelist || session.user.ip_whitelist.length === 0) {
      return true;
    }

    try {
      const response = await fetch('/api/admin/auth/check-ip');
      const result = await response.json();
      return result.allowed;
    } catch {
      return false;
    }
  }

  /**
   * Refresh admin session
   */
  async refreshSession(): Promise<AdminApiResponse<AdminSession>> {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error || !session) {
        this.clearSession();
        return {
          success: false,
          error: 'Session expired'
        };
      }

      // Re-fetch admin user data
      const { data: adminUser, error: adminError } = await this.supabase
        .from('admin_users_with_roles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (adminError || !adminUser) {
        this.clearSession();
        return {
          success: false,
          error: 'Admin privileges revoked'
        };
      }

      const newSession: AdminSession = {
        user: adminUser as AdminUserWithRole,
        token: session.access_token,
        expires_at: session.expires_at || ''
      };

      // Update stored session
      const storage = localStorage.getItem('admin_session') ? localStorage : sessionStorage;
      storage.setItem('admin_session', JSON.stringify(newSession));

      return {
        success: true,
        data: newSession
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to refresh session'
      };
    }
  }
}

// Export singleton instance
export const adminAuthService = new AdminAuthService();