'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { useAuthContext } from '@/contexts/AuthContext';
import Link from 'next/link';
import styles from './Auth.module.css';

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
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>
          Sign in to continue fixing artwork for DTF printing.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
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
          <div className={`${styles.alert} ${styles.alertError}`} role="alert">
            {error}
          </div>
        )}

        {errors.root && (
          <div className={`${styles.alert} ${styles.alertError}`} role="alert">
            {errors.root.message}
          </div>
        )}

        {/* Submit Button */}
        <button type="submit" className={styles.btnPrimary} disabled={loading}>
          {loading && <span className={styles.spinner} aria-hidden="true" />}
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        {/* Links */}
        <div className={styles.linkRow}>
          <Link href="/auth/forgot-password" className={styles.link}>
            Forgot password?
          </Link>
          <span>
            New to DTF Editor?{' '}
            <Link href="/auth/signup" className={styles.link}>
              Create an account
            </Link>
          </span>
        </div>
      </form>
    </div>
  );
}
