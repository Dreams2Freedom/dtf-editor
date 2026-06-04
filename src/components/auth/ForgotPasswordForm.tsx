'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { useAuthContext } from '@/contexts/AuthContext';
import Link from 'next/link';
import styles from './Auth.module.css';

// Forgot password form schema
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
}

export function ForgotPasswordForm({ onSuccess }: ForgotPasswordFormProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { resetPassword, loading, clearError } = useAuthContext();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError: setFormError,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    clearError();

    const result = await resetPassword(data.email);

    if (result.success) {
      setIsSubmitted(true);
      onSuccess?.();
    } else {
      setFormError('root', {
        type: 'manual',
        message: result.error || 'Failed to send reset email',
      });
    }
  };

  if (isSubmitted) {
    return (
      <div>
        <div className={styles.header}>
          <div className={styles.statusIcon}>
            <Mail className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className={styles.title}>Check your email</h1>
          <p className={styles.subtitle}>
            We&apos;ve sent you a password reset link. Please check your email
            and follow the instructions.
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
        <h1 className={styles.title}>Reset your password</h1>
        <p className={styles.subtitle}>
          Enter your email and we&apos;ll send instructions to get you back into
          your account.
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

        {/* Form Error */}
        {errors.root && (
          <div className={`${styles.alert} ${styles.alertError}`} role="alert">
            {errors.root.message}
          </div>
        )}

        {/* Submit Button */}
        <button type="submit" className={styles.btnPrimary} disabled={loading}>
          {loading && <span className={styles.spinner} aria-hidden="true" />}
          {loading ? 'Sending…' : 'Send Reset Link'}
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
