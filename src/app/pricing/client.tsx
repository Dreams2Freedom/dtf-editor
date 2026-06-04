'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useReferralTracking } from '@/hooks/useReferralTracking';
import { LoadingPage } from '@/components/ui/LoadingPage';
import { LoggedInPricing } from './LoggedInPricing';
import { PublicPricingDetails } from './PublicPricingDetails';

export default function PricingClient() {
  const { user, loading, initialize } = useAuthStore();

  // Preserve affiliate referral tracking for visitors landing on /pricing.
  useReferralTracking();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return <LoadingPage message="Loading pricing..." />;
  }

  // Logged-in users keep the existing functional checkout experience
  // (SubscriptionPlans / PayAsYouGo) untouched. Public visitors get the
  // redesigned pricing details page that matches the new homepage.
  return user ? <LoggedInPricing /> : <PublicPricingDetails />;
}
