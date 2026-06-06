'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useAuthStore } from '@/stores/authStore';
import { TrialPlanCards } from '@/components/billing/TrialPlanCards';
import {
  isTrialEligible,
  isPromptDismissedThisCycle,
  dismissPromptForCycle,
} from '@/lib/trial';

/**
 * Shown once per free monthly cycle to trial-eligible Free users, encouraging a
 * 7-day Basic or Starter trial. Dismissal is tracked in localStorage keyed to
 * the current cycle, so it won't nag again this cycle but returns next cycle.
 * Paid / trialing / previously-subscribed users never see it (not eligible).
 */
export function FreeTrialUpgradeModal() {
  const { user, profile, loading } = useAuthStore();
  const [open, setOpen] = useState(false);

  const userId = user?.id;
  const eligible = isTrialEligible(
    profile as Parameters<typeof isTrialEligible>[0]
  );

  useEffect(() => {
    if (loading || !userId || !eligible) return;
    if (isPromptDismissedThisCycle(userId)) return;
    // Small delay so the dashboard shell paints first (non-blocking).
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, [loading, userId, eligible]);

  const dismiss = () => {
    if (userId) dismissPromptForCycle(userId);
    setOpen(false);
  };

  if (!eligible) return null;

  return (
    <Modal
      open={open}
      onOpenChange={next => {
        // Closing via the X / overlay counts as "stay on Free" for this cycle.
        if (!next) dismiss();
        else setOpen(true);
      }}
      title="Your free credits are ready — want more power this month?"
      description="Start a 7-day Basic or Starter trial to unlock more credits, HD downloads, and faster artwork cleanup."
      size="lg"
    >
      <TrialPlanCards eligible onStayFree={dismiss} />
    </Modal>
  );
}
