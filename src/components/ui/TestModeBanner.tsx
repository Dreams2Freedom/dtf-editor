'use client';

import { useEffect, useState } from 'react';

export default function TestModeBanner() {
  const [isTestMode, setIsTestMode] = useState(false);

  useEffect(() => {
    // Check if we're using test Stripe keys
    const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
    setIsTestMode(stripeKey.includes('_test_'));
  }, []);

  if (!isTestMode) return null;

  return (
    <div className="bg-yellow-500 text-black text-center py-2 text-sm font-medium">
      <div className="container mx-auto px-4">
        🧪 TEST MODE - Payments are in test mode. No real charges will occur.
        Use card 4242 4242 4242 4242 for testing.
      </div>
    </div>
  );
}
