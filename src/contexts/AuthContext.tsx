'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  ReactNode,
  useMemo,
} from 'react';
import { useAuthStore } from '@/stores/authStore';
import { User, Session } from '@supabase/supabase-js';

// Profile type
interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  company_name?: string; // Changed from company to company_name to match database
  phone?: string;
  avatar_url?: string;
  credits_remaining: number;
  subscription_status: string;
  subscription_plan: string;
  is_admin: boolean;
  credit_expires_at?: string; // When pay-as-you-go credits expire (for extended storage)
  created_at: string;
  updated_at: string;
}

// Auth context interface
interface AuthContextType {
  // Auth state
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;

  // Profile state
  profile: UserProfile | null;
  creditsRemaining: number;
  subscriptionStatus: string;
  subscriptionPlan: string;

  // Auth actions
  signIn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    metadata?: {
      firstName?: string;
      lastName?: string;
      company?: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: {
    firstName?: string;
    lastName?: string;
    company?: string;
    phone?: string;
    avatarUrl?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (
    email: string
  ) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  checkCredits: (requiredCredits: number) => Promise<boolean>;
  refreshCredits: () => Promise<void>;
  clearError: () => void;
}

// Create auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export function AuthProvider({ children }: AuthProviderProps) {
  // Get all state and actions from the store at once
  const authStore = useAuthStore();

  // Initialize auth state on mount
  useEffect(() => {
    try {
      authStore.initialize();
    } catch (error) {
      // Error is handled by the auth store
    }
  }, []); // Empty dependency array - only run once on mount

  // Periodically check session validity
  useEffect(() => {
    if (!authStore.user) return;

    // Check session validity every 5 minutes
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
        });

        if (response.status === 401) {
          console.log('Session expired, signing out...');
          await authStore.signOut();
        }
      } catch (error) {
        console.error('Session check failed:', error);
      }
    };

    // Initial check after 30 seconds
    const initialTimer = setTimeout(checkSession, 30000);

    // Then check every 5 minutes
    const interval = setInterval(checkSession, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [authStore.user]);

  // Memoize the context value to prevent infinite re-renders
  const authContextValue: AuthContextType = useMemo(
    () => ({
      // Auth state
      user: authStore.user,
      session: authStore.session,
      loading: authStore.loading,
      error: authStore.error,
      isAuthenticated: !!authStore.user,
      isAdmin: authStore.isAdmin,

      // Profile state
      profile: authStore.profile,
      creditsRemaining: authStore.creditsRemaining,
      subscriptionStatus: authStore.subscriptionStatus,
      subscriptionPlan: authStore.subscriptionPlan,

      // Auth actions
      signIn: authStore.signIn,
      signUp: authStore.signUp,
      signOut: authStore.signOut,
      updateProfile: authStore.updateProfile,
      resetPassword: authStore.resetPassword,
      updatePassword: authStore.updatePassword,
      checkCredits: authStore.checkCredits,
      refreshCredits: authStore.refreshCredits,
      clearError: authStore.clearError,
    }),
    [authStore]
  );

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

// Hook to require authentication
export function useRequireAuth() {
  const { isAuthenticated, loading } = useAuthContext();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = '/auth/login';
    }
  }, [isAuthenticated, loading]);

  return { loading: loading || !isAuthenticated };
}

// Hook to require admin access
export function useRequireAdmin() {
  const { isAdmin, loading } = useAuthContext();

  useEffect(() => {
    if (!loading && !isAdmin) {
      window.location.href = '/dashboard';
    }
  }, [isAdmin, loading]);

  return { loading: loading || !isAdmin };
}

// Hook to require guest access (not authenticated)
export function useRequireGuest() {
  const { isAuthenticated, loading } = useAuthContext();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      window.location.href = '/dashboard';
    }
  }, [isAuthenticated, loading]);

  return { loading: loading || isAuthenticated };
}
