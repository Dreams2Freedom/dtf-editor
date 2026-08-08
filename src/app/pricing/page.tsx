import { Suspense } from 'react';
import type { Metadata } from 'next';
import PricingClient from './client';
import { MetaViewContent } from '@/components/analytics/MetaViewContent';

export const metadata: Metadata = {
  title: 'Pricing — DTF Editor',
  description:
    'Simple pricing that grows with your business. Start free with 2 credits. Plans from $9.99/mo.',
  openGraph: {
    title: 'Pricing — DTF Editor',
    description:
      'Simple pricing that grows with your business. Start free with 2 credits. Plans from $9.99/mo.',
  },
};

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          Loading pricing...
        </div>
      }
    >
      {/* Meta ViewContent — the /pricing page IS the pricing content. */}
      <MetaViewContent contentName="Pricing" contentCategory="pricing" />
      <PricingClient />
    </Suspense>
  );
}
