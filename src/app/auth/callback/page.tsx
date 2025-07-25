'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/services/auth'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          setStatus('error')
          setMessage('Authentication failed. Please try again.')
          return
        }

        if (data.session) {
          setStatus('success')
          setMessage('Authentication successful! Redirecting...')
          
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            router.push('/dashboard')
          }, 2000)
        } else {
          setStatus('error')
          setMessage('No session found. Please try signing in again.')
        }
      } catch (error) {
        setStatus('error')
        setMessage('An unexpected error occurred. Please try again.')
      }
    }

    handleAuthCallback()
  }, [router])

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-16 w-16 text-primary-500 animate-spin" />
      case 'success':
        return <CheckCircle className="h-16 w-16 text-success-500" />
      case 'error':
        return <XCircle className="h-16 w-16 text-error-500" />
    }
  }

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Processing...'
      case 'success':
        return 'Success!'
      case 'error':
        return 'Error'
    }
  }

  return (
    <AuthLayout title="Authentication" subtitle="Sign in to your account">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          {getIcon()}
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {getTitle()}
        </h1>
        
        <p className="text-gray-600 mb-6">
          {message}
        </p>

        {status === 'error' && (
          <div className="space-y-4">
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full bg-primary-500 text-white py-2 px-4 rounded-lg hover:bg-primary-600 transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </AuthLayout>
  )
} 