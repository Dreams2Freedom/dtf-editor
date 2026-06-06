'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { isTrialEligible, dismissPromptForCycle } from '@/lib/trial';
import { TrialPlanCards } from '@/components/billing/TrialPlanCards';
import { LoadingPage } from '@/components/ui/LoadingPage';

/**
 * Post-signup plan selection. New users land here (instead of straight on the
 * dashboard) and are strongly encouraged to start a 7-day Basic or Starter
 * trial. Free remains available as a clearly-labelled secondary option
 * ("No thanks, stay on Free").
 */
export default function SelectPlanPage() {
  const { user, profile, loading, initialize } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return <LoadingPage message="Setting up your account…" />;
  }

  const eligible = isTrialEligible(profile as Parameters<typeof isTrialEligible>[0]);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <div className="mb-8 text-center">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {eligible ? 'Start with a 7-day trial' : 'Choose your plan'}
          </span>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            {eligible
              ? 'Start your 7-day trial and unlock the tools that fix artwork faster'
              : 'Pick the plan that fits your workflow'}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-gray-600 sm:text-base">
            {eligible
              ? 'Most users get better results by starting with Basic or Starter. Add a card to start your trial today, then keep using DTF Editor after your trial ends.'
              : 'Subscribe to unlock more credits, HD downloads, and faster artwork cleanup. You can change or cancel anytime.'}
          </p>
        </div>

        <TrialPlanCards
          eligible={eligible}
          onStayFree={() => {
            // Choosing Free here also suppresses the dashboard upgrade modal
            // for the current cycle so the user isn't immediately re-prompted.
            if (user?.id) dismissPromptForCycle(user.id);
            router.push('/dashboard');
          }}
        />

        <p className="mt-8 text-center text-xs text-gray-400">
          You can manage or cancel your membership anytime from{' '}
          <Link href="/settings?tab=billing" className="underline">
            Billing &amp; Membership
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
