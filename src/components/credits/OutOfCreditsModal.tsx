'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Zap, CreditCard, ArrowUpRight, Mail } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useAuthStore } from '@/stores/authStore';
import { startPlanCheckout } from '@/lib/checkout';
import { setIntendedTool } from '@/lib/intendedTool';
import {
  isTrialEligible,
  getOutOfCreditCase,
  TRIAL_DISCLOSURE,
} from '@/lib/trial';

/**
 * Out-of-credit prompt shown BEFORE a paid tool workflow begins (so users never
 * configure/upload only to fail later). The options adapt to the user's state:
 *  A free_eligible    – Basic/Starter trial + Buy Credits + stay Free
 *  B free_not_eligible– Pick a Plan + Buy Credits + stay Free
 *  C paid             – Upgrade Plan + Buy Credits
 *  D professional     – Buy More Credits + Contact for a larger plan
 *  E trialing         – Upgrade Plan + Buy Credits (clearly "in a trial")
 *
 * This is a UX gate only; server-side credit validation still applies.
 */

interface OutOfCreditsModalProps {
  open: boolean;
  onClose: () => void;
  /** Human-readable tool name, e.g. "Vectorization". */
  toolName?: string;
  /** Route the user was trying to reach, preserved for after checkout. */
  toolRoute?: string;
}

const PRICING = '/pricing';
const BUY_CREDITS = '/pricing?tab=payasyougo';
const CONTACT = '/contact?topic=custom-plan';

export function OutOfCreditsModal({
  open,
  onClose,
  toolName,
  toolRoute,
}: OutOfCreditsModalProps) {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eligible = isTrialEligible(
    profile as Parameters<typeof isTrialEligible>[0]
  );
  const variant = getOutOfCreditCase(
    profile as Parameters<typeof getOutOfCreditCase>[0],
    eligible
  );
  const plan = (profile?.subscription_plan || 'free').toLowerCase();

  // Persist the intended tool so the dashboard can offer "continue" after the
  // Stripe round-trip.
  const remember = () => {
    if (toolRoute) setIntendedTool(toolRoute, toolName || 'your tool');
  };

  const startTrial = async (planId: 'basic' | 'starter') => {
    setError(null);
    setPending(planId);
    remember();
    const { url, error: err } = await startPlanCheckout(planId, {
      trial: true,
    });
    if (url) {
      window.location.href = url;
      return;
    }
    setError(err || 'Could not start checkout. Please try again.');
    setPending(null);
  };

  const navigate = (href: string) => {
    remember();
    router.push(href);
    onClose();
  };

  // ---- copy per case ----
  const title =
    variant === 'free_eligible'
      ? 'You’re out of credits — start a 7-day trial to keep going'
      : variant === 'paid'
        ? 'You’re out of credits for this cycle'
        : variant === 'professional'
          ? 'You’ve used all your credits'
          : variant === 'trialing'
            ? 'You’re out of trial credits'
            : 'You’re out of credits';

  const body =
    variant === 'free_eligible'
      ? 'Unlock more credits and paid tools with a Basic or Starter trial. You’ll add a card today and billing starts after 7 days unless canceled.'
      : variant === 'free_not_eligible'
        ? 'Choose a monthly plan for more credits, or buy Pay As You Go credits if you only need a few extra tool runs.'
        : variant === 'paid'
          ? `Upgrade your plan for more monthly credits, or buy Pay As You Go credits to keep working right now.${
              plan === 'basic'
                ? ' Starter and Professional include more monthly credits.'
                : plan === 'starter'
                  ? ' Professional includes the most monthly credits.'
                  : ''
            }`
          : variant === 'professional'
            ? 'Buy more credits to keep processing artwork today, or contact us if you need a larger custom plan.'
            : `You’re currently on a trial. ${
                plan === 'basic'
                  ? 'Upgrade to Starter or Professional'
                  : 'Upgrade to Professional'
              } for more monthly credits, or buy Pay As You Go credits to keep working now.`;

  return (
    <Modal open={open} onOpenChange={next => !next && onClose()} title={title} description={body} size="md">
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="space-y-3">
        {variant === 'free_eligible' && (
          <>
            {/* Starter — most prominent (Best Value) */}
            <button
              type="button"
              onClick={() => startTrial('starter')}
              disabled={pending !== null}
              className="flex w-full min-h-[44px] items-center justify-between gap-3 rounded-xl bg-amber-500 px-4 py-3 text-left font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
            >
              <span className="flex items-center gap-2">
                {pending === 'starter' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Start Starter Trial
              </span>
              <span className="text-xs font-normal text-amber-50">
                7 days free · then $24.99/mo · 60 credits · Best Value
              </span>
            </button>

            {/* Basic */}
            <button
              type="button"
              onClick={() => startTrial('basic')}
              disabled={pending !== null}
              className="flex w-full min-h-[44px] items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-left font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-60"
            >
              <span className="flex items-center gap-2">
                {pending === 'basic' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Start Basic Trial
              </span>
              <span className="text-xs font-normal text-amber-700">
                7 days free · then $9.99/mo · 20 credits
              </span>
            </button>

            <SecondaryButton
              onClick={() => navigate(BUY_CREDITS)}
              icon={<CreditCard className="h-4 w-4" />}
              label="Buy Pay As You Go Credits"
            />

            <p className="text-center text-xs text-gray-500">
              {TRIAL_DISCLOSURE}
            </p>
            <StayFree onClick={onClose} />
          </>
        )}

        {variant === 'free_not_eligible' && (
          <>
            <PrimaryButton
              onClick={() => navigate(PRICING)}
              icon={<ArrowUpRight className="h-4 w-4" />}
              label="Pick a Plan"
            />
            <SecondaryButton
              onClick={() => navigate(BUY_CREDITS)}
              icon={<CreditCard className="h-4 w-4" />}
              label="Buy Pay As You Go Credits"
            />
            <StayFree onClick={onClose} />
          </>
        )}

        {(variant === 'paid' || variant === 'trialing') && (
          <>
            <PrimaryButton
              onClick={() => navigate(PRICING)}
              icon={<ArrowUpRight className="h-4 w-4" />}
              label="Upgrade Plan"
            />
            <SecondaryButton
              onClick={() => navigate(BUY_CREDITS)}
              icon={<CreditCard className="h-4 w-4" />}
              label="Buy Pay As You Go Credits"
            />
          </>
        )}

        {variant === 'professional' && (
          <>
            <PrimaryButton
              onClick={() => navigate(BUY_CREDITS)}
              icon={<CreditCard className="h-4 w-4" />}
              label="Buy More Credits"
            />
            <button
              type="button"
              onClick={() => navigate(CONTACT)}
              className="mx-auto block text-sm font-medium text-blue-600 underline-offset-2 hover:underline"
            >
              <Mail className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
              Contact us about a larger plan
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

function PrimaryButton({
  onClick,
  label,
  icon,
}: {
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-amber-600"
    >
      {icon}
      {label}
    </button>
  );
}

function SecondaryButton({
  onClick,
  label,
  icon,
}: {
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-blue-300 bg-white px-4 py-3 font-semibold text-blue-700 transition-colors hover:bg-blue-50"
    >
      {icon}
      {label}
    </button>
  );
}

function StayFree({ onClick }: { onClick: () => void }) {
  return (
    <div className="pt-1 text-center">
      <button
        type="button"
        onClick={onClick}
        className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
      >
        No thanks, stay on Free
      </button>
    </div>
  );
}
