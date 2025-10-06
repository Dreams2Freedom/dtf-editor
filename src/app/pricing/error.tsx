'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CreditCard, RefreshCw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PricingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Pricing/Payment error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-md w-full">
        <div className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <CreditCard className="h-12 w-12 text-gray-400" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment System Unavailable
          </h1>

          <p className="text-gray-600 mb-6">
            We're having trouble loading pricing information. This is usually
            temporary. Please try again in a moment.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={reset}
              className="flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Go Home
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
