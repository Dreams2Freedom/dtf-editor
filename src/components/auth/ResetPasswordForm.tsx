'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { useAuthContext } from '@/contexts/AuthContext';
import Link from 'next/link';
import styles from './Auth.module.css';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

// Reset password form schema
const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, 'Password is required')
      .min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
  onSuccess?: () => void;
}

export function ResetPasswordForm({ onSuccess }: ResetPasswordFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { loading, clearError } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError: setFormError,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  // Check if we have the required parameters from Supabase
  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const type = searchParams.get('type');

    // For now, let's allow the form to be submitted even without tokens
    // We'll handle the token validation in the onSubmit function
  }, [searchParams]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    clearError();

    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    // If we have an access token, use it for password reset
    if (accessToken) {
      try {
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        });

        const { error } = await supabase.auth.updateUser({
          password: data.password,
        });

        if (error) {
          setFormError('root', {
            type: 'manual',
            message:
              error.message || 'Failed to reset password. Please try again.',
          });
          return;
        }
        setIsSubmitted(true);
        onSuccess?.();
        return;
      } catch (error) {
        setFormError('root', {
          type: 'manual',
          message: 'An error occurred during password reset. Please try again.',
        });
        return;
      }
    }

    // If no access token, show an error message
    setFormError('root', {
      type: 'manual',
      message:
        'Invalid or expired reset link. Please request a new password reset from the forgot password page.',
    });
  };

  if (isSubmitted) {
    return (
      <div>
        <div className={styles.header}>
          <div className={styles.statusIcon}>
            <Lock className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className={styles.title}>Password updated successfully</h1>
          <p className={styles.subtitle}>
            Your password has been reset. You can now sign in with your new
            password.
          </p>
        </div>

        <div className={`${styles.linkRow} ${styles.center}`}>
          <Link href="/auth/login" className={`${styles.link} ${styles.backLink}`}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Create a new password</h1>
        <p className={styles.subtitle}>
          Choose a new password to continue using DTF Editor.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        {/* Password Field */}
        <div className="relative">
          <Input
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your new password"
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

        {/* Confirm Password Field */}
        <div className="relative">
          <Input
            label="Confirm New Password"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm your new password"
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

        {/* Error Messages */}
        {errors.root && (
          <div className={`${styles.alert} ${styles.alertError}`} role="alert">
            {errors.root.message}
          </div>
        )}

        {/* Submit Button */}
        <button type="submit" className={styles.btnPrimary} disabled={loading}>
          {loading && <span className={styles.spinner} aria-hidden="true" />}
          {loading ? 'Updating password…' : 'Update Password'}
        </button>

        {/* Back to Login */}
        <div className={`${styles.linkRow} ${styles.center}`}>
          <Link href="/auth/login" className={`${styles.link} ${styles.backLink}`}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to sign in
          </Link>
        </div>
      </form>
    </div>
  );
}
