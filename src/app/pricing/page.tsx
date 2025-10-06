import { Suspense } from 'react';
import PricingClient from './client';

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          Loading pricing...
        </div>
      }
    >
      <PricingClient />
    </Suspense>
  );
}
