'use client';

import { useState } from 'react';
import { Check, Loader2, Star } from 'lucide-react';
import { startPlanCheckout } from '@/lib/checkout';

/**
 * Paid monthly plan picker (no trial) for Free users who have already used their
 * one trial. Used in the Case B free-cycle / out-of-credit prompts. "Choose X"
 * CTAs route straight to a normal subscription checkout (trial: false), so no
 * trial wording is shown to ineligible users. Pay As You Go is offered as a
 * secondary option and "No thanks, stay on Free" remains the smallest action.
 */

interface PlanDef {
  id: 'basic' | 'starter' | 'professional';
  name: string;
  price: string;
  credits: string;
  recommended?: boolean;
}

const PLANS: PlanDef[] = [
  { id: 'basic', name: 'Basic', price: '$9.99', credits: '20 credits / month' },
  {
    id: 'starter',
    name: 'Starter',
    price: '$24.99',
    credits: '60 credits / month',
    recommended: true,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '$49.99',
    credits: '150 credits / month',
  },
];

interface PaidPlanCardsProps {
  /** Secondary action — go to the Pay As You Go credit packs. */
  onBuyCredits: () => void;
  /** Smallest action — stay on Free for this cycle. */
  onStayFree: () => void;
  /** Include the Professional option (default true). */
  includeProfessional?: boolean;
}

export function PaidPlanCards({
  onBuyCredits,
  onStayFree,
  includeProfessional = true,
}: PaidPlanCardsProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const plans = includeProfessional
    ? PLANS
    : PLANS.filter(p => p.id !== 'professional');

  const choose = async (planId: PlanDef['id']) => {
    setError(null);
    setPending(planId);
    const { url, error: err } = await startPlanCheckout(planId, {
      trial: false,
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

      <div className="grid gap-3 sm:grid-cols-3">
        {plans.map(plan => {
          const isRec = !!plan.recommended;
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-xl border bg-white p-4 ${
                isRec
                  ? 'border-amber-400 ring-2 ring-amber-200'
                  : 'border-gray-200'
              }`}
            >
              {isRec && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                  Best Value
                </span>
              )}
              <div className="mb-1 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">{plan.name}</h3>
                {isRec && (
                  <Star
                    className="h-4 w-4 text-amber-500"
                    aria-hidden="true"
                    fill="currentColor"
                  />
                )}
              </div>
              <p className="text-xl font-bold text-gray-900">
                {plan.price}
                <span className="text-sm font-normal text-gray-500">/mo</span>
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                <Check
                  className="h-4 w-4 flex-shrink-0 text-emerald-500"
                  aria-hidden="true"
                />
                {plan.credits}
              </p>
              <button
                type="button"
                onClick={() => choose(plan.id)}
                disabled={pending !== null}
                className={`mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                  isRec
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {pending === plan.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Starting…
                  </>
                ) : (
                  `Choose ${plan.name}`
                )}
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onBuyCredits}
        disabled={pending !== null}
        className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-blue-300 bg-white px-4 py-3 font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:opacity-60"
      >
        Buy Pay As You Go Credits
      </button>

      <div className="mt-3 text-center">
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
