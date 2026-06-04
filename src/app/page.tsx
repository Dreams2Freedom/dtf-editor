'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useReferralTracking } from '@/hooks/useReferralTracking';
import { LoadingPage } from '@/components/ui/LoadingPage';
import { SiteHeader } from '@/components/public/landing/SiteHeader';
import { Hero } from '@/components/public/landing/Hero';
import { TestimonialTicker } from '@/components/public/landing/TestimonialTicker';
import { HowItWorks } from '@/components/public/landing/HowItWorks';
import { ToolShowcase } from '@/components/public/landing/ToolShowcase';
import { DpiChecker } from '@/components/public/landing/DpiChecker';
import { PricingTeaser } from '@/components/public/landing/PricingTeaser';
import { FaqAccordion } from '@/components/public/landing/FaqAccordion';
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
        <TestimonialTicker />
        <HowItWorks />
        <ToolShowcase />
        <DpiChecker />
        <PricingTeaser />
        <FaqAccordion />
      </main>
      <SiteFooter />
    </div>
  );
}
