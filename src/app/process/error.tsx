'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProcessingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Processing error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-md w-full">
        <div className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-orange-500" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Processing Error
          </h1>

          <p className="text-gray-600 mb-6">
            We couldn't process your image. This might be a temporary issue with
            our processing service. Please try again in a moment.
          </p>

          <div className="mb-6 p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-orange-800">
              <strong>Note:</strong> No credits have been deducted from your
              account.
            </p>
          </div>

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
              onClick={() => router.push('/dashboard')}
              className="flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
