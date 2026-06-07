'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, CreditCard } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useAuthStore } from '@/stores/authStore';
import { TrialPlanCards } from '@/components/billing/TrialPlanCards';
import {
  isTrialEligible,
  getOutOfCreditCase,
  isPromptDismissedThisCycle,
  dismissPromptForCycle,
} from '@/lib/trial';

/**
 * Shown once per free monthly cycle to Free users. Trial-eligible users get a
 * 7-day Basic/Starter trial push; Free users who already used their trial get a
 * "pick a plan / buy credits" prompt instead. Dismissal is tracked in
 * localStorage keyed to the current cycle, so it won't nag again this cycle but
 * returns next cycle. Paid / trialing users never see it.
 */
export function FreeTrialUpgradeModal() {
  const router = useRouter();
  const { user, profile, loading } = useAuthStore();
  const [open, setOpen] = useState(false);

  const userId = user?.id;
  const eligible = isTrialEligible(
    profile as Parameters<typeof isTrialEligible>[0]
  );
  const variant = getOutOfCreditCase(
    profile as Parameters<typeof getOutOfCreditCase>[0],
    eligible
  );
  const isFreeUser =
    variant === 'free_eligible' || variant === 'free_not_eligible';

  useEffect(() => {
    if (loading || !userId || !isFreeUser) return;
    if (isPromptDismissedThisCycle(userId)) return;
    // Small delay so the dashboard shell paints first (non-blocking).
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, [loading, userId, isFreeUser]);

  const dismiss = () => {
    if (userId) dismissPromptForCycle(userId);
    setOpen(false);
  };

  const navigate = (href: string) => {
    if (userId) dismissPromptForCycle(userId);
    router.push(href);
  };

  if (!isFreeUser) return null;

  return (
    <Modal
      open={open}
      onOpenChange={next => {
        // Closing via the X / overlay counts as "stay on Free" for this cycle.
        if (!next) dismiss();
        else setOpen(true);
      }}
      title={
        eligible
          ? 'Your free credits are ready — want more power this month?'
          : 'Your free credits are ready'
      }
      description={
        eligible
          ? 'Start a 7-day Basic or Starter trial to unlock more credits, HD downloads, and faster artwork cleanup.'
          : 'Choose a monthly plan for more credits, or buy Pay As You Go credits if you only need a few extra tool runs.'
      }
      size={eligible ? 'lg' : 'md'}
    >
      {eligible ? (
        <TrialPlanCards eligible onStayFree={dismiss} />
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate('/pricing')}
            className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-amber-600"
          >
            <ArrowUpRight className="h-4 w-4" /> Pick a Plan
          </button>
          <button
            type="button"
            onClick={() => navigate('/pricing?tab=payasyougo')}
            className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-blue-300 bg-white px-4 py-3 font-semibold text-blue-700 transition-colors hover:bg-blue-50"
          >
            <CreditCard className="h-4 w-4" /> Buy Pay As You Go Credits
          </button>
          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={dismiss}
              className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
            >
              No thanks, stay on Free
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
