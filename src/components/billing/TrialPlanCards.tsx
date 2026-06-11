'use client';

import { useState } from 'react';
import { Check, Loader2, Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { startPlanCheckout } from '@/lib/checkout';
import { TRIAL_DISCLOSURE } from '@/lib/trial';

/**
 * Reusable Basic/Starter trial cards used on the post-signup plan-selection
 * screen and inside the Free-user upgrade modal. Starter is emphasised as the
 * recommended "Best value" option. When `eligible` is false (e.g. a returning
 * user who already used their trial) the cards fall back to plain Subscribe
 * CTAs and hide trial wording — no deceptive copy.
 */

interface PlanDef {
  id: 'basic' | 'starter';
  name: string;
  price: string;
  credits: string;
  blurb: string;
  recommended?: boolean;
}

const PLANS: PlanDef[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: '$9.99',
    credits: '20 credits per month',
    blurb: 'Good for creators who need occasional artwork cleanup.',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$24.99',
    credits: '60 credits per month',
    blurb: 'Best value for frequent artwork cleanup.',
    recommended: true,
  },
];

interface TrialPlanCardsProps {
  /** Whether to present these as trials (true) or plain subscriptions (false). */
  eligible: boolean;
  /** Secondary "No thanks, stay on Free" action. */
  onStayFree: () => void;
  /** Compact layout for use inside the modal. */
  compact?: boolean;
}

export function TrialPlanCards({
  eligible,
  onStayFree,
  compact = false,
}: TrialPlanCardsProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async (planId: 'basic' | 'starter') => {
    setError(null);
    setPending(planId);
    const { url, error: err } = await startPlanCheckout(planId, {
      trial: eligible,
    });
    if (url) {
      window.location.href = url;
      return;
    }
    setError(err || 'Could not start checkout. Please try again.');
    setPending(null);
  };

  return (
    <div>
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div
        className={`grid gap-4 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2'}`}
      >
        {PLANS.map(plan => {
          const isRec = !!plan.recommended;
          const ctaLabel = eligible
            ? `Start ${plan.name} Trial`
            : `Subscribe to ${plan.name}`;
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-xl border bg-white p-5 transition-all ${
                isRec
                  ? 'border-amber-400 ring-2 ring-amber-200 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {isRec && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                  Best Value
                </span>
              )}

              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                {isRec && (
                  <Star
                    className="h-5 w-5 text-amber-500"
                    aria-hidden="true"
                    fill="currentColor"
                  />
                )}
              </div>

              {eligible ? (
                <p className="text-sm font-semibold text-emerald-700">
                  7 days free
                </p>
              ) : null}
              <p className="mt-0.5 text-2xl font-bold text-gray-900">
                {plan.price}
                <span className="text-sm font-normal text-gray-500">
                  /month{eligible ? ' after trial' : ''}
                </span>
              </p>

              <ul className="mt-3 space-y-1.5 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <Check
                    className="h-4 w-4 flex-shrink-0 text-emerald-500"
                    aria-hidden="true"
                  />
                  {plan.credits}
                </li>
                <li className="flex items-start gap-2">
                  <Check
                    className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500"
                    aria-hidden="true"
                  />
                  {plan.blurb}
                </li>
              </ul>

              <Button
                onClick={() => handleStart(plan.id)}
                disabled={pending !== null}
                className={`mt-4 w-full ${
                  isRec
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {pending === plan.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting…
                  </>
                ) : (
                  ctaLabel
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {eligible && (
        <p className="mt-4 text-center text-xs text-gray-500">
          {TRIAL_DISCLOSURE}
        </p>
      )}

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={onStayFree}
          disabled={pending !== null}
          className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline disabled:opacity-50"
        >
          No thanks, stay on Free
        </button>
      </div>
    </div>
  );
}
