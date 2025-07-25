'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, Eye, EyeOff, User, Building } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthContext } from '@/contexts/AuthContext'
import Link from 'next/link'

// Signup form schema
const signupSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  company: z
    .string()
    .max(100, 'Company name must be less than 100 characters')
    .optional(),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type SignupFormData = z.infer<typeof signupSchema>

interface SignupFormProps {
  onSuccess?: () => void
  redirectTo?: string
}

export function SignupForm({ onSuccess, redirectTo }: SignupFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { signUp, loading, error, clearError } = useAuthContext()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError: setFormError,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupFormData) => {
    clearError()
    
    const result = await signUp(data.email, data.password, {
      firstName: data.firstName,
      lastName: data.lastName,
      company: data.company,
    })
    
    if (result.success) {
      onSuccess?.()
      if (redirectTo) {
        window.location.href = redirectTo
      } else {
        window.location.href = '/dashboard'
      }
    } else {
      setFormError('root', {
        type: 'manual',
        message: result.error || 'Sign up failed',
      })
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Create your account
        </h1>
        <p className="text-gray-600">
          Get started with DTF Editor today
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First name"
            type="text"
            placeholder="John"
            leftIcon={<User className="h-5 w-5" />}
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <Input
            label="Last name"
            type="text"
            placeholder="Doe"
            leftIcon={<User className="h-5 w-5" />}
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>

        {/* Email Field */}
        <Input
          label="Email address"
          type="email"
          placeholder="john@example.com"
          leftIcon={<Mail className="h-5 w-5" />}
          error={errors.email?.message}
          {...register('email')}
        />

        {/* Company Field */}
        <Input
          label="Company (optional)"
          type="text"
          placeholder="Your company name"
          leftIcon={<Building className="h-5 w-5" />}
          error={errors.company?.message}
          {...register('company')}
        />

        {/* Password Field */}
        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a strong password"
            leftIcon={<Lock className="h-5 w-5" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            }
            error={errors.password?.message}
            helperText="Must be at least 8 characters with uppercase, lowercase, and number"
            {...register('password')}
          />
        </div>

        {/* Confirm Password Field */}
        <div className="relative">
          <Input
            label="Confirm password"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm your password"
            leftIcon={<Lock className="h-5 w-5" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            }
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 text-sm text-error-600 bg-error-50 border border-error-200 rounded-lg">
            {error}
          </div>
        )}

        {/* Form Error */}
        {errors.root && (
          <div className="p-3 text-sm text-error-600 bg-error-50 border border-error-200 rounded-lg">
            {errors.root.message}
          </div>
        )}

        {/* Terms and Privacy */}
        <div className="text-sm text-gray-600">
          By creating an account, you agree to our{' '}
          <Link
            href="/terms"
            className="text-primary-600 hover:text-primary-500 transition-colors"
          >
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link
            href="/privacy"
            className="text-primary-600 hover:text-primary-500 transition-colors"
          >
            Privacy Policy
          </Link>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          fullWidth
          loading={loading}
          disabled={loading}
        >
          Create account
        </Button>

        {/* Sign In Link */}
        <div className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="text-primary-600 hover:text-primary-500 font-medium transition-colors"
          >
            Sign in
          </Link>
        </div>
      </form>
    </div>
  )
} 