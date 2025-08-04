import { User, Session, AuthError } from '@supabase/supabase-js';
import { createClientSupabaseClient } from '@/lib/supabase/client';

// Auth state types
export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

// User profile type
export interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  company?: string;
  phone?: string;
  avatar_url?: string;
  credits_remaining: number;
  subscription_status: string;
  subscription_plan: string;
  is_admin: boolean;
  last_credit_purchase_at?: string;
  created_at: string;
  updated_at: string;
}

// Activity log type
export interface ActivityLog {
  id: string;
  user_id: string;
  activity_type: string;
  activity_data?: Record<string, unknown>;
  created_at: string;
}

// Auth service class
export class AuthService {
  private getSupabase() {
    // Always create client on demand to ensure proper initialization
    return createClientSupabaseClient();
  }

  // Get auth state (combines session and user)
  async getAuthState(): Promise<AuthState> {
    try {
      const session = await this.getSession();
      const user = session?.user || null;
      
      return {
        user,
        session,
        loading: false,
        error: null
      };
    } catch (error) {
      console.error('Error getting auth state:', error);
      return {
        user: null,
        session: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get current session
  async getSession(): Promise<Session | null> {
    try {
      const {
        data: { session },
      } = await this.getSupabase().auth.getSession();
      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  // Get current user
  async getUser(): Promise<User | null> {
    try {
      const {
        data: { user },
      } = await this.getSupabase().auth.getUser();
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  // Get user profile
  async getUserProfile(userId?: string): Promise<UserProfile | null> {
    try {
      const user = userId ? { id: userId } : await this.getUser();
      if (!user) return null;

      const { data, error } = await this.getSupabase()
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      // Map credits field for backward compatibility
      if (data && 'credits' in data && !('credits_remaining' in data)) {
        data.credits_remaining = data.credits;
      }
      
      return data;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  // Sign up
  async signUp(
    email: string,
    password: string,
    metadata?: {
      firstName?: string;
      lastName?: string;
      company?: string;
    }
  ): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      const { data, error } = await this.getSupabase().auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (error) throw error;

      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: error as AuthError };
    }
  }

  // Sign in
  async signIn(
    email: string,
    password: string
  ): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      const { data, error } = await this.getSupabase().auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: error as AuthError };
    }
  }

  // Sign out
  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await this.getSupabase().auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  // Reset password
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await this.getSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  // Update password
  async updatePassword(password: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await this.getSupabase().auth.updateUser({ password });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  // Update profile
  async updateProfile(
    userId: string,
    updates: {
      firstName?: string;
      lastName?: string;
      company?: string;
      phone?: string;
      avatarUrl?: string;
    }
  ): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.getSupabase()
        .from('profiles')
        .update({
          first_name: updates.firstName,
          last_name: updates.lastName,
          company: updates.company,
          phone: updates.phone,
          avatar_url: updates.avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  // Update user email
  async updateEmail(email: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await this.getSupabase().auth.updateUser({ email });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  // Verify email with OTP
  async verifyOtp(
    email: string,
    token: string,
    type: 'signup' | 'recovery' | 'email_change' | 'email'
  ): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      const { data, error } = await this.getSupabase().auth.verifyOtp({
        email,
        token,
        type,
      });

      if (error) throw error;

      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: error as AuthError };
    }
  }

  // Log activity
  async logActivity(
    userId: string,
    activityType: string,
    activityData?: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.getSupabase().from('activity_logs').insert({
        user_id: userId,
        activity_type: activityType,
        activity_data: activityData,
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  // Get activity logs
  async getActivityLogs(
    userId: string,
    limit: number = 10
  ): Promise<ActivityLog[]> {
    try {
      const { data, error } = await this.getSupabase()
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting activity logs:', error);
      return [];
    }
  }

  // Subscribe to auth state changes
  onAuthStateChange(callback: (user: User | null) => void) {
    return this.getSupabase().auth.onAuthStateChange((event, session) => {
      callback(session?.user || null);
    });
  }
}

// Export singleton instance
export const authService = new AuthService();