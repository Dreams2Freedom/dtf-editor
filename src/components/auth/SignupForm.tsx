'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, User, Building } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { useAuthContext } from '@/contexts/AuthContext';
import Link from 'next/link';
import styles from './Auth.module.css';

// Signup form schema
const signupSchema = z
  .object({
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
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

interface SignupFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

// The pricing-page CTAs pass the Stripe subscription plan id directly
// (basic | starter | professional). We validate against the known ids before
// starting checkout; this does not change any Stripe price/product IDs.
const CHECKOUT_PLAN_IDS = new Set(['basic', 'starter', 'professional']);

// Basic & Starter are offered as 7-day trials; the server re-validates trial
// eligibility and ignores the flag for anything else.
const TRIAL_PLAN_IDS = new Set(['basic', 'starter']);

// Kick off Stripe Checkout for a just-signed-up user via the existing
// pricing + checkout-session APIs. Returns the checkout URL, or null on any
// failure so the caller can fall back gracefully.
async function startSubscriptionCheckout(
  stripePlanId: string
): Promise<string | null> {
  try {
    const pricingRes = await fetch('/api/stripe/pricing');
    if (!pricingRes.ok) return null;
    const pricing = await pricingRes.json();
    const plan = (pricing.subscriptionPlans || []).find(
      (p: { id: string; stripePriceId?: string }) => p.id === stripePlanId
    );
    if (!plan?.stripePriceId) return null;

    const res = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId: plan.stripePriceId,
        mode: 'subscription',
        trial: TRIAL_PLAN_IDS.has(stripePlanId),
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.url || null;
  } catch {
    return null;
  }
}

export function SignupForm({ onSuccess, redirectTo }: SignupFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signUp, loading, error, clearError } = useAuthContext();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError: setFormError,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    clearError();

    const result = await signUp(data.email, data.password, {
      firstName: data.firstName,
      lastName: data.lastName,
      company: data.company,
    });

    if (result.success) {
      onSuccess?.();

      // Add a 2-second delay to ensure the welcome email fetch completes
      // This is a temporary fix to diagnose the issue
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Post-signup handoff: if the user picked a plan on the pricing page
      // (?plan=hobbyist|small-business), send them straight into Stripe
      // Checkout; otherwise honor ?next= (e.g. the pay-as-you-go picker), or
      // fall back to the dashboard.
      const params = new URLSearchParams(window.location.search);
      const planSlug = params.get('plan');
      const next = params.get('next');
      const stripePlanId =
        planSlug && CHECKOUT_PLAN_IDS.has(planSlug) ? planSlug : undefined;

      if (stripePlanId) {
        const checkoutUrl = await startSubscriptionCheckout(stripePlanId);
        // If checkout couldn't start, drop the user on the pricing page
        // rather than leaving them stranded mid-flow.
        window.location.href = checkoutUrl || '/pricing';
        return;
      }

      if (next) {
        window.location.href = next;
        return;
      }

      // No explicit plan/next chosen: route new users through the
      // trial-focused plan selection screen (Free remains a secondary option
      // there) instead of dropping them straight on the dashboard.
      window.location.href = redirectTo || '/auth/select-plan';
    } else {
      setFormError('root', {
        type: 'manual',
        message: result.error || 'Sign up failed',
      });
    }
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Create your DTF Editor account</h1>
        <p className={styles.subtitle}>
          Start with the free DPI checker, then unlock artwork tools when you
          choose a plan.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        {/* Name Fields */}
        <div className={styles.nameGrid}>
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
          <div className={`${styles.alert} ${styles.alertError}`} role="alert">
            {error}
          </div>
        )}

        {/* Form Error */}
        {errors.root && (
          <div className={`${styles.alert} ${styles.alertError}`} role="alert">
            {errors.root.message}
          </div>
        )}

        {/* Terms and Privacy */}
        <p className={styles.fineprint}>
          By creating an account, you agree to our{' '}
          <Link href="/terms" className={styles.link}>
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className={styles.link}>
            Privacy Policy
          </Link>
        </p>

        {/* Submit Button */}
        <button type="submit" className={styles.btnPrimary} disabled={loading}>
          {loading && <span className={styles.spinner} aria-hidden="true" />}
          {loading ? 'Creating account…' : 'Create Account'}
        </button>

        {/* Sign In Link */}
        <div className={`${styles.linkRow} ${styles.center}`}>
          <span>
            Already have an account?{' '}
            <Link href="/auth/login" className={styles.link}>
              Sign in
            </Link>
          </span>
        </div>
      </form>
    </div>
  );
}
