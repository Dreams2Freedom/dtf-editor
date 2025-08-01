import { User, Session, AuthError } from '@supabase/supabase-js';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { env } from '@/config/env';
import { emailService } from '@/services/email';

// Create Supabase client
export const supabase = typeof window !== 'undefined' ? createClientSupabaseClient() : null!;

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
  private supabase = supabase || (typeof window !== 'undefined' ? createClientSupabaseClient() : null!);

  // Get current session
  async getSession(): Promise<Session | null> {
    try {
      const {
        data: { session },
        error,
      } = await this.supabase.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      return null;
    }
  }

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    try {
      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      return null;
    }
  }

  // Sign up with email and password
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
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${env.APP_URL}/auth/callback`,
        },
      });

      if (error) throw error;

      // Profile is created automatically by database trigger (handle_new_user function)
      
      // Send welcome email
      if (data.user) {
        try {
          await emailService.sendWelcomeEmail({
            email: data.user.email || email,
            firstName: metadata?.firstName,
            planName: 'Free', // New users start with free plan
          });
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
          // Don't fail the signup if email fails
        }
      }

      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: error as AuthError };
    }
  }

  // Sign in with email and password
  async signIn(
    email: string,
    password: string
  ): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
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
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  // Reset password
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${env.APP_URL}/auth/reset-password`,
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
      const { error } = await this.supabase.auth.updateUser({
        password,
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  // Update profile
  async updateProfile(updates: {
    firstName?: string;
    lastName?: string;
    company?: string;
    phone?: string;
    avatarUrl?: string;
  }): Promise<{ error: AuthError | null }> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      await this.updateUserProfile(user.id, updates);
      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  // Note: Profile creation is now handled automatically by database trigger
  // No manual profile creation needed

  // Update user profile
  private async updateUserProfile(
    userId: string,
    updates: {
      firstName?: string;
      lastName?: string;
      company?: string;
      phone?: string;
      avatarUrl?: string;
    }
  ): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {};

      if (updates.firstName !== undefined)
        updateData.first_name = updates.firstName;
      if (updates.lastName !== undefined)
        updateData.last_name = updates.lastName;
      if (updates.company !== undefined) updateData.company = updates.company;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.avatarUrl !== undefined)
        updateData.avatar_url = updates.avatarUrl;

      const { error } = await this.supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      // Log profile update activity
      await this.logActivity(userId, 'profile_updated', updateData);
    } catch (error) {
      throw error;
    }
  }

  // Get user profile
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return null;
    }
  }

  // Check if user has enough credits
  async checkCredits(
    userId: string,
    requiredCredits: number
  ): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(userId);
      return profile ? profile.credits_remaining >= requiredCredits : false;
    } catch (error) {
      return false;
    }
  }

  // Log user activity
  async logActivity(
    userId: string,
    activityType: string,
    activityData?: Record<string, unknown>
  ): Promise<void> {
    try {
      const { error } = await this.supabase.from('user_activity_logs').insert({
        user_id: userId,
        activity_type: activityType,
        activity_data: activityData,
      });

      if (error) throw error;
    } catch (error) {
      // Don't throw error for activity logging failures
    }
  }

  // Listen to auth state changes
  onAuthStateChange(
    callback: (event: string, session: Session | null) => void
  ) {
    return this.supabase.auth.onAuthStateChange(callback);
  }

  // Get current auth state
  async getAuthState(): Promise<AuthState> {
    try {
      const session = await this.getSession();
      const user = session?.user || null;

      return {
        user,
        session,
        loading: false,
        error: null,
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
