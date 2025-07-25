import { createClient } from '@supabase/supabase-js';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { env } from '@/config/env';

// Create Supabase client
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

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
  private supabase = supabase;

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
      console.error('Error getting session:', error);
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
      console.error('Error getting current user:', error);
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

      // If user is created, create profile
      if (data.user) {
        await this.createUserProfile(data.user, metadata);
      }

      return { user: data.user, error: null };
    } catch (error) {
      console.error('Error signing up:', error);
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
      console.error('Error signing in:', error);
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
      console.error('Error signing out:', error);
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
      console.error('Error resetting password:', error);
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
      console.error('Error updating password:', error);
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
      console.error('Error updating profile:', error);
      return { error: error as AuthError };
    }
  }

  // Create user profile
  private async createUserProfile(
    user: User,
    metadata?: {
      firstName?: string;
      lastName?: string;
      company?: string;
    }
  ): Promise<void> {
    try {
      const { error } = await this.supabase.from('profiles').insert({
        id: user.id,
        email: user.email,
        first_name: metadata?.firstName,
        last_name: metadata?.lastName,
        company: metadata?.company,
        credits_remaining: 2, // Free tier credits
        subscription_status: 'free',
        subscription_plan: 'free',
        is_admin: false,
      });

      if (error) throw error;

      // Log user creation activity
      await this.logActivity(user.id, 'user_created', {
        email: user.email,
        firstName: metadata?.firstName,
        lastName: metadata?.lastName,
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

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
      console.error('Error updating user profile:', error);
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
      console.error('Error getting user profile:', error);
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
      console.error('Error checking credits:', error);
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
      console.error('Error logging activity:', error);
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
      console.error('Error getting auth state:', error);
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
