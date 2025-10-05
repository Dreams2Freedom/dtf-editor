'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthContext } from '@/contexts/AuthContext';
import Link from 'next/link';

// Login form schema
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

export function LoginForm({ onSuccess, redirectTo }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, loading, error, clearError } = useAuthContext();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError: setFormError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    clearError();

    const result = await signIn(data.email, data.password);

    if (result.success) {
      onSuccess?.();
      if (redirectTo) {
        window.location.href = redirectTo;
      } else {
        window.location.href = '/dashboard';
      }
    } else {
      setFormError('root', {
        type: 'manual',
        message: result.error || 'Sign in failed',
      });
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h1>
        <p className="text-gray-600">Sign in to your account to continue</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Email Field */}
        <Input
          label="Email address"
          type="email"
          placeholder="Enter your email"
          leftIcon={<Mail className="h-5 w-5" />}
          error={errors.email?.message}
          {...register('email')}
        />

        {/* Password Field */}
        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
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
            {...register('password')}
          />
        </div>

        {/* Error Messages */}
        {error && (
          <div className="p-3 text-sm text-error-600 bg-error-50 border border-error-200 rounded-lg">
            {error}
          </div>
        )}

        {errors.root && (
          <div className="p-3 text-sm text-error-600 bg-error-50 border border-error-200 rounded-lg">
            {errors.root.message}
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          fullWidth
          loading={loading}
          disabled={loading}
        >
          Sign in
        </Button>

        {/* Links */}
        <div className="flex items-center justify-between text-sm">
          <Link
            href="/auth/forgot-password"
            className="text-primary-600 hover:text-primary-500"
          >
            Forgot your password?
          </Link>
          <span className="text-gray-600">
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/signup"
              className="text-primary-600 hover:text-primary-500 font-medium"
            >
              Sign up
            </Link>
          </span>
        </div>
      </form>
    </div>
  );
}
