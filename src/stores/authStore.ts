import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { authService, AuthState, UserProfile } from '@/services/auth';

// Auth store state interface
interface AuthStoreState extends AuthState {
  profile: UserProfile | null;
  isAdmin: boolean;
  creditsRemaining: number;
  subscriptionStatus: string;
  subscriptionPlan: string;
}

// Auth store actions interface
interface AuthStoreActions {
  // Initialize auth state
  initialize: () => Promise<void>;

  // Auth operations
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

  // Profile operations
  updateProfile: (updates: {
    firstName?: string;
    lastName?: string;
    company?: string;
    phone?: string;
    avatarUrl?: string;
  }) => Promise<{ success: boolean; error?: string }>;

  // Password operations
  resetPassword: (
    email: string
  ) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (
    password: string
  ) => Promise<{ success: boolean; error?: string }>;

  // Credit operations
  checkCredits: (requiredCredits: number) => Promise<boolean>;
  refreshCredits: () => Promise<void>;

  // Utility actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

// Combined store type
type AuthStore = AuthStoreState & AuthStoreActions;

// Create the auth store
export const useAuthStore = create<AuthStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    user: null,
    session: null,
    loading: true,
    error: null,
    profile: null,
    isAdmin: false,
    creditsRemaining: 0,
    subscriptionStatus: 'free',
    subscriptionPlan: 'free',

    // Initialize auth state
    initialize: async () => {
      set({ loading: true, error: null });

      try {
        const authState = await authService.getAuthState();

        if (authState.user) {
          // Get user profile
          const profile = await authService.getUserProfile(authState.user.id);

          set({
            user: authState.user,
            session: authState.session,
            profile,
            isAdmin: profile?.is_admin || false,
            creditsRemaining: profile?.credits ?? profile?.credits_remaining ?? 0,
            subscriptionStatus: profile?.subscription_status || 'free',
            subscriptionPlan: profile?.subscription_plan || 'free',
            loading: false,
            error: null,
          });
        } else {
          set({
            user: null,
            session: null,
            profile: null,
            isAdmin: false,
            creditsRemaining: 0,
            subscriptionStatus: 'free',
            subscriptionPlan: 'free',
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        set({
          user: null,
          session: null,
          profile: null,
          isAdmin: false,
          creditsRemaining: 0,
          subscriptionStatus: 'free',
          subscriptionPlan: 'free',
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    // Sign in
    signIn: async (email: string, password: string) => {
      set({ loading: true, error: null });

      try {
        const result = await authService.signIn(email, password);

        if (result.error) {
          set({ loading: false, error: result.error.message });
          return { success: false, error: result.error.message };
        }

        if (result.user) {
          // Get user profile
          const profile = await authService.getUserProfile(result.user.id);

          set({
            user: result.user,
            session: result.user ? await authService.getSession() : null,
            profile,
            isAdmin: profile?.is_admin || false,
            creditsRemaining: profile?.credits ?? profile?.credits_remaining ?? 0,
            subscriptionStatus: profile?.subscription_status || 'free',
            subscriptionPlan: profile?.subscription_plan || 'free',
            loading: false,
            error: null,
          });

          return { success: true };
        } else {
          set({ loading: false, error: 'Sign in failed' });
          return { success: false, error: 'Sign in failed' };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Sign in failed';
        set({ loading: false, error: errorMessage });
        return { success: false, error: errorMessage };
      }
    },

    // Sign up
    signUp: async (
      email: string,
      password: string,
      metadata?: {
        firstName?: string;
        lastName?: string;
        company?: string;
      }
    ) => {
      set({ loading: true, error: null });

      try {
        const result = await authService.signUp(email, password, metadata);

        if (result.error) {
          set({ loading: false, error: result.error.message });
          return { success: false, error: result.error.message };
        }

        if (result.user) {
          // Get user profile
          const profile = await authService.getUserProfile(result.user.id);

          set({
            user: result.user,
            session: result.user ? await authService.getSession() : null,
            profile,
            isAdmin: profile?.is_admin || false,
            creditsRemaining: profile?.credits ?? profile?.credits_remaining ?? 0,
            subscriptionStatus: profile?.subscription_status || 'free',
            subscriptionPlan: profile?.subscription_plan || 'free',
            loading: false,
            error: null,
          });

          return { success: true };
        } else {
          set({ loading: false, error: 'Sign up failed' });
          return { success: false, error: 'Sign up failed' };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Sign up failed';
        set({ loading: false, error: errorMessage });
        return { success: false, error: errorMessage };
      }
    },

    // Sign out
    signOut: async () => {
      set({ loading: true, error: null });

      try {
        const result = await authService.signOut();

        if (result.error) {
          set({ loading: false, error: result.error.message });
          return { success: false, error: result.error.message };
        }

        set({
          user: null,
          session: null,
          profile: null,
          isAdmin: false,
          creditsRemaining: 0,
          subscriptionStatus: 'free',
          subscriptionPlan: 'free',
          loading: false,
          error: null,
        });

        return { success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Sign out failed';
        set({ loading: false, error: errorMessage });
        return { success: false, error: errorMessage };
      }
    },

    // Update profile
    updateProfile: async updates => {
      set({ loading: true, error: null });

      try {
        const result = await authService.updateProfile(updates);

        if (result.error) {
          set({ loading: false, error: result.error.message });
          return { success: false, error: result.error.message };
        }

        // Refresh profile data
        const user = get().user;
        if (user) {
          const profile = await authService.getUserProfile(user.id);
          set({
            profile,
            isAdmin: profile?.is_admin || false,
            creditsRemaining: profile?.credits ?? profile?.credits_remaining ?? 0,
            subscriptionStatus: profile?.subscription_status || 'free',
            subscriptionPlan: profile?.subscription_plan || 'free',
            loading: false,
            error: null,
          });
        }

        return { success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Profile update failed';
        set({ loading: false, error: errorMessage });
        return { success: false, error: errorMessage };
      }
    },

    // Update profile
    updateProfile: async (profileData: Partial<Profile>) => {
      const user = get().user;
      if (!user) {
        return { success: false, error: 'No user logged in' };
      }

      try {
        const profile = get().profile;
        if (profile) {
          // Update local state immediately for optimistic UI
          set({
            profile: {
              ...profile,
              ...profileData,
            },
          });
        }
        return { success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Profile update failed';
        return { success: false, error: errorMessage };
      }
    },

    // Reset password
    resetPassword: async (email: string) => {
      set({ loading: true, error: null });

      try {
        const result = await authService.resetPassword(email);

        if (result.error) {
          set({ loading: false, error: result.error.message });
          return { success: false, error: result.error.message };
        }

        set({ loading: false, error: null });
        return { success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Password reset failed';
        set({ loading: false, error: errorMessage });
        return { success: false, error: errorMessage };
      }
    },

    // Update password
    updatePassword: async (password: string) => {
      set({ loading: true, error: null });

      try {
        const result = await authService.updatePassword(password);

        if (result.error) {
          set({ loading: false, error: result.error.message });
          return { success: false, error: result.error.message };
        }

        set({ loading: false, error: null });
        return { success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Password update failed';
        set({ loading: false, error: errorMessage });
        return { success: false, error: errorMessage };
      }
    },

    // Check credits
    checkCredits: async (requiredCredits: number) => {
      const user = get().user;
      if (!user) return false;

      try {
        return await authService.checkCredits(user.id, requiredCredits);
      } catch (error) {
        return false;
      }
    },

    // Refresh credits
    refreshCredits: async () => {
      const user = get().user;
      if (!user) return;

      try {
        const profile = await authService.getUserProfile(user.id);
        if (profile) {
          set({
            profile, // Update the entire profile object
            creditsRemaining: profile.credits_remaining,
            subscriptionStatus: profile.subscription_status,
            subscriptionPlan: profile.subscription_plan,
          });
        }
      } catch (error) {
        console.error('Error refreshing credits:', error);
      }
    },

    // Set loading
    setLoading: (loading: boolean) => set({ loading }),

    // Set error
    setError: (error: string | null) => set({ error }),

    // Clear error
    clearError: () => set({ error: null }),
  }))
);

// Individual selector hooks to avoid infinite loops
export const useUser = () => useAuthStore(state => state.user);
export const useSession = () => useAuthStore(state => state.session);
export const useLoading = () => useAuthStore(state => state.loading);
export const useError = () => useAuthStore(state => state.error);
export const useIsAuthenticated = () => useAuthStore(state => !!state.user);
export const useIsAdmin = () => useAuthStore(state => state.isAdmin);

export const useProfile = () => useAuthStore(state => state.profile);
export const useCreditsRemaining = () => useAuthStore(state => state.creditsRemaining);
export const useSubscriptionStatus = () => useAuthStore(state => state.subscriptionStatus);
export const useSubscriptionPlan = () => useAuthStore(state => state.subscriptionPlan);

// Action hooks
export const useSignIn = () => useAuthStore(state => state.signIn);
export const useSignUp = () => useAuthStore(state => state.signUp);
export const useSignOut = () => useAuthStore(state => state.signOut);
export const useUpdateProfile = () => useAuthStore(state => state.updateProfile);
export const useResetPassword = () => useAuthStore(state => state.resetPassword);
export const useUpdatePassword = () => useAuthStore(state => state.updatePassword);
export const useCheckCredits = () => useAuthStore(state => state.checkCredits);
export const useRefreshCredits = () => useAuthStore(state => state.refreshCredits);
export const useClearError = () => useAuthStore(state => state.clearError);
export const useInitialize = () => useAuthStore(state => state.initialize);
