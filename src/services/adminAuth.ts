import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/config/env';
import type {
  AdminLoginRequest,
  AdminPermissions,
  AdminApiResponse,
} from '@/types/admin';

// SEC-023/NEW-08/NEW-09: Admin auth refactored to remove localStorage/sessionStorage.
// Permissions are fetched from the server and cached in volatile memory only.
// The httpOnly admin_session cookie (signed with HMAC) is the sole session token.

interface AdminClientSession {
  user: {
    id: string;
    email: string;
    full_name?: string;
  };
  permissions: AdminPermissions;
}

class AdminAuthService {
  private supabase;
  // In-memory cache — not XSS-stealable, cleared on page refresh
  private cachedSession: AdminClientSession | null = null;
  private cacheExpiry = 0;
  private static CACHE_TTL = 60_000; // 60 seconds

  constructor() {
    this.supabase = createBrowserClient(
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY
    );
  }

  /**
   * Admin login - separate from regular user login
   */
  async login({
    email,
    password,
    remember = false,
  }: AdminLoginRequest): Promise<AdminApiResponse<{ user: AdminClientSession['user']; permissions: AdminPermissions; requires_2fa: boolean }>> {
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
          error: result.error || 'Login failed',
        };
      }

      // SEC-023: Cache session data in volatile memory only (not localStorage).
      // This data is for UI rendering; actual auth is via httpOnly cookies.
      if (result.data) {
        this.cachedSession = {
          user: result.data.user,
          permissions: result.data.permissions,
        };
        this.cacheExpiry = Date.now() + AdminAuthService.CACHE_TTL;
      }

      // Migrate: clear any legacy localStorage/sessionStorage data
      try {
        localStorage.removeItem('admin_session');
        sessionStorage.removeItem('admin_session');
      } catch {
        // Ignore storage access errors
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'An error occurred during login',
      };
    }
  }

  /**
   * Verify 2FA code
   */
  async verify2FA({
    code,
  }: {
    code: string;
    session_token?: string;
  }): Promise<AdminApiResponse<any>> {
    try {
      const response = await fetch('/api/admin/auth/2fa-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
        credentials: 'include',
      });

      const result = await response.json();

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Invalid 2FA code',
        };
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to verify 2FA code',
      };
    }
  }

  /**
   * Get current admin session from server.
   * NEW-09: Permissions are always fetched from the server, never from client storage.
   */
  async getSessionAsync(): Promise<AdminClientSession | null> {
    // Return memory cache if fresh
    if (this.cachedSession && Date.now() < this.cacheExpiry) {
      return this.cachedSession;
    }

    try {
      const response = await fetch('/api/admin/auth/check', {
        credentials: 'include',
      });

      if (!response.ok) {
        this.cachedSession = null;
        return null;
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        this.cachedSession = null;
        return null;
      }

      this.cachedSession = {
        user: result.data.user,
        permissions: result.data.permissions,
      };
      this.cacheExpiry = Date.now() + AdminAuthService.CACHE_TTL;

      return this.cachedSession;
    } catch {
      return null;
    }
  }

  /**
   * Synchronous session getter — returns the in-memory cache.
   * For backwards compatibility with code that calls getSession() synchronously.
   * Returns null if cache is expired; callers should use getSessionAsync() for fresh data.
   */
  getSession(): AdminClientSession | null {
    if (this.cachedSession && Date.now() < this.cacheExpiry) {
      return this.cachedSession;
    }
    return null;
  }

  /**
   * Check if user has specific permission.
   * NEW-09: Reads from server-fetched memory cache, not localStorage.
   * This is for UI rendering only; actual enforcement is server-side.
   */
  hasPermission(permissionPath: string[]): boolean {
    const session = this.getSession();
    if (!session) return false;

    let current: any = session.permissions;

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
        },
        credentials: 'include',
      });
    } catch (error) {
      // Silent fail on logout request
    }

    // Clear in-memory cache
    this.cachedSession = null;
    this.cacheExpiry = 0;

    // Clean up any legacy localStorage/sessionStorage data
    try {
      localStorage.removeItem('admin_session');
      sessionStorage.removeItem('admin_session');
    } catch {
      // Ignore storage access errors
    }
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
      await fetch('/api/admin/audit/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          details,
        }),
        credentials: 'include',
      });
    } catch (error) {
      // Silent fail for audit logging
    }
  }

  /**
   * Setup 2FA for admin account
   */
  async setup2FA(): Promise<
    AdminApiResponse<{ qrCode: string; secret: string }>
  > {
    try {
      const response = await fetch('/api/admin/auth/2fa-setup', {
        method: 'POST',
        credentials: 'include',
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'Failed to setup 2FA',
      };
    }
  }

  /**
   * Check if current IP is whitelisted
   */
  async checkIPWhitelist(): Promise<boolean> {
    try {
      const response = await fetch('/api/admin/auth/check-ip', {
        credentials: 'include',
      });
      const result = await response.json();
      return result.allowed;
    } catch {
      return false;
    }
  }

  /**
   * Refresh admin session from server
   */
  async refreshSession(): Promise<AdminApiResponse<AdminClientSession>> {
    const session = await this.getSessionAsync();

    if (!session) {
      return {
        success: false,
        error: 'Session expired',
      };
    }

    return {
      success: true,
      data: session,
    };
  }
}

// Export singleton instance
export const adminAuthService = new AdminAuthService();
