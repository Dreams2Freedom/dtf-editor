'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useReferralTracking } from '@/hooks/useReferralTracking';
import { LoadingPage } from '@/components/ui/LoadingPage';
import { SiteHeader } from '@/components/public/landing/SiteHeader';
import { Hero } from '@/components/public/landing/Hero';
import { TrustStrip } from '@/components/public/landing/TrustStrip';
import { ProblemStrip } from '@/components/public/landing/ProblemStrip';
import { ToolShowcase } from '@/components/public/landing/ToolShowcase';
import { DpiChecker } from '@/components/public/landing/DpiChecker';
import { HowItWorks } from '@/components/public/landing/HowItWorks';
import { WhyDtfEditor } from '@/components/public/landing/WhyDtfEditor';
import { PricingTeaser } from '@/components/public/landing/PricingTeaser';
import { FaqAccordion } from '@/components/public/landing/FaqAccordion';
import { FinalCta } from '@/components/public/landing/FinalCta';
import { SiteFooter } from '@/components/public/landing/SiteFooter';
import '@/components/public/landing/landing.css';

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
    <div className="dtfLanding" id="top">
      <SiteHeader />
      <main>
        <Hero />
        <TrustStrip />
        <ProblemStrip />
        <ToolShowcase />
        <DpiChecker />
        <HowItWorks />
        <WhyDtfEditor />
        <PricingTeaser />
        <FaqAccordion />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
