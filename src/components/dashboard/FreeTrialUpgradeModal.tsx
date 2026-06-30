'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { useAuthStore } from '@/stores/authStore';
import { TrialPlanCards } from '@/components/billing/TrialPlanCards';
import { PaidPlanCards } from '@/components/billing/PaidPlanCards';
import {
  isTrialEligible,
  getOutOfCreditCase,
  isPromptDismissedThisCycle,
  dismissPromptForCycle,
  isFirstDashboardPromptSeen,
  markFirstDashboardPromptSeen,
} from '@/lib/trial';

/**
 * Dashboard upgrade prompt for Free users. Handles two distinct prompts with a
 * single component so they never double up on the first visit:
 *
 *  - First-dashboard prompt: shown once ever, the first time a Free user lands
 *    on the dashboard (task copy). Tracked via markFirstDashboardPromptSeen.
 *  - Monthly Free-cycle prompt: shown once per free monthly cycle thereafter.
 *
 * Trial-eligible users see Basic/Starter trial cards; Free users who already
 * used their trial see Pick-a-Plan / Buy-Credits instead. Paid / trialing users
 * never see it.
 */
export function FreeTrialUpgradeModal() {
  const router = useRouter();
  const { user, profile, loading } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

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

    const firstTime = !isFirstDashboardPromptSeen(userId);
    const cycleDismissed = isPromptDismissedThisCycle(userId);
    // Nothing to show: already saw the first-dashboard prompt AND dismissed this
    // cycle's monthly prompt.
    if (!firstTime && cycleDismissed) return;

    setIsFirstTime(firstTime);
    // Small delay so the dashboard shell paints first (non-blocking).
    const t = setTimeout(() => {
      setOpen(true);
      if (firstTime) {
        // Record the one-time prompt as shown, and treat this cycle as handled
        // so the monthly prompt doesn't also fire now (it resumes next cycle).
        markFirstDashboardPromptSeen(userId);
        dismissPromptForCycle(userId);
      }
    }, 600);
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

  // Case A: trial-eligible Free user. Case B: trial already used.
  const title = eligible
    ? isFirstTime
      ? 'Start your 7-day trial and unlock more artwork tools'
      : 'Your free credits are ready — want more power this month?'
    : 'Ready for more credits this month?';

  const description = eligible
    ? isFirstTime
      ? 'Basic and Starter give you more credits for background removal, upscaling, vectorization, and AI image generation. Add a card today and billing starts after your trial unless canceled.'
      : 'Start a 7-day Basic or Starter trial to unlock more credits, HD downloads, and faster artwork cleanup.'
    : 'You have used your free trial, but you can keep working with a monthly plan or Pay As You Go credits.';

  return (
    <Modal
      open={open}
      onOpenChange={next => {
        // Closing via the X / overlay counts as "stay on Free" for this cycle.
        if (!next) dismiss();
        else setOpen(true);
      }}
      title={title}
      description={description}
      size="lg"
    >
      {eligible ? (
        <TrialPlanCards eligible onStayFree={dismiss} />
      ) : (
        <PaidPlanCards
          onBuyCredits={() => navigate('/pricing?tab=payasyougo')}
          onStayFree={dismiss}
        />
      )}
    </Modal>
  );
}
