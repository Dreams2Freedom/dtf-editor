'use client'

import React, { createContext, useContext, useEffect, ReactNode } from 'react'
import { useAuthStore, useAuth, useProfile, useAuthActions } from '@/stores/authStore'
import { User, Session } from '@supabase/supabase-js'

// Profile type
interface UserProfile {
  id: string
  first_name?: string
  last_name?: string
  email?: string
  company?: string
  phone?: string
  avatar_url?: string
  credits_remaining: number
  subscription_status: string
  subscription_plan: string
  is_admin: boolean
  created_at: string
  updated_at: string
}

// Auth context interface
interface AuthContextType {
  // Auth state
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  isAdmin: boolean
  
  // Profile state
  profile: UserProfile | null
  creditsRemaining: number
  subscriptionStatus: string
  subscriptionPlan: string
  
  // Auth actions
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, metadata?: {
    firstName?: string
    lastName?: string
    company?: string
  }) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<{ success: boolean; error?: string }>
  updateProfile: (updates: {
    firstName?: string
    lastName?: string
    company?: string
    phone?: string
    avatarUrl?: string
  }) => Promise<{ success: boolean; error?: string }>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>
  checkCredits: (requiredCredits: number) => Promise<boolean>
  refreshCredits: () => Promise<void>
  clearError: () => void
}

// Create auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Auth provider props
interface AuthProviderProps {
  children: ReactNode
}

// Auth provider component
export function AuthProvider({ children }: AuthProviderProps) {
  const { initialize } = useAuthStore()
  
  // Initialize auth state on mount
  useEffect(() => {
    initialize()
  }, [initialize])

  // Get auth state and actions
  const auth = useAuth()
  const profile = useProfile()
  const actions = useAuthActions()

  // Combine all auth data
  const authContextValue: AuthContextType = {
    // Auth state
    user: auth.user,
    session: auth.session,
    loading: auth.loading,
    error: auth.error,
    isAuthenticated: auth.isAuthenticated,
    isAdmin: auth.isAdmin,
    
    // Profile state
    profile: profile.profile,
    creditsRemaining: profile.creditsRemaining,
    subscriptionStatus: profile.subscriptionStatus,
    subscriptionPlan: profile.subscriptionPlan,
    
    // Auth actions
    signIn: actions.signIn,
    signUp: actions.signUp,
    signOut: actions.signOut,
    updateProfile: actions.updateProfile,
    resetPassword: actions.resetPassword,
    updatePassword: actions.updatePassword,
    checkCredits: actions.checkCredits,
    refreshCredits: actions.refreshCredits,
    clearError: actions.clearError
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook to use auth context
export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

// Hook to require authentication
export function useRequireAuth() {
  const { isAuthenticated, loading } = useAuthContext()
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = '/auth/login'
    }
  }, [isAuthenticated, loading])

  return { loading: loading || !isAuthenticated }
}

// Hook to require admin access
export function useRequireAdmin() {
  const { isAdmin, loading } = useAuthContext()
  
  useEffect(() => {
    if (!loading && !isAdmin) {
      window.location.href = '/dashboard'
    }
  }, [isAdmin, loading])

  return { loading: loading || !isAdmin }
}

// Hook to require guest access (not authenticated)
export function useRequireGuest() {
  const { isAuthenticated, loading } = useAuthContext()
  
  useEffect(() => {
    if (!loading && isAuthenticated) {
      window.location.href = '/dashboard'
    }
  }, [isAuthenticated, loading])

  return { loading: loading || isAuthenticated }
} 