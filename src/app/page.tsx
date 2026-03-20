'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useReferralTracking } from '@/hooks/useReferralTracking';
import { LoadingPage } from '@/components/ui/LoadingPage';
import { LandingHero } from '@/components/public/LandingHero';
import { ToolShowcase } from '@/components/public/ToolShowcase';
import { HowItWorks } from '@/components/public/HowItWorks';
import { WhyDTFEditor } from '@/components/public/WhyDTFEditor';
import { PricingTeaser } from '@/components/public/PricingTeaser';
import { LandingFAQ } from '@/components/public/LandingFAQ';
import { LandingCTA } from '@/components/public/LandingCTA';
import { TOOLS } from '@/lib/publicData';

export default function HomePage() {
  const router = useRouter();
  const { user, loading, initialize } = useAuthStore();

  // Track affiliate referrals
  useReferralTracking();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  if (loading) {
    return <LoadingPage message="Loading..." />;
  }

  if (user) {
    return null;
  }

  return (
    <main className="min-h-screen">
      <LandingHero />

      {/* Tool Showcases */}
      <div id="features" className="bg-white">
        {TOOLS.map((tool, i) => (
          <div key={tool.slug}>
            <ToolShowcase tool={tool} index={i} />
            {i < TOOLS.length - 1 && (
              <div className="h-px bg-gray-100 max-w-7xl mx-auto" />
            )}
          </div>
        ))}
      </div>

      <HowItWorks />
      <WhyDTFEditor />
      <PricingTeaser />
      <LandingFAQ />
      <LandingCTA />
    </main>
  );
}
