'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Shield, RefreshCw, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Admin panel error:', error);

    // Log to admin audit log if critical
    if (
      error.message?.includes('Security') ||
      error.message?.includes('Auth')
    ) {
      console.error('SECURITY ERROR IN ADMIN PANEL:', error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-md w-full">
        <div className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-error-500" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Admin Panel Error
          </h1>

          <p className="text-gray-600 mb-6">
            An error occurred in the admin panel. This incident has been logged
            for review.
          </p>

          {process.env.NODE_ENV === 'development' && error.message && (
            <div className="mb-6 p-4 bg-error-50 rounded-lg text-left">
              <p className="text-sm font-mono text-error-800">
                {error.message}
              </p>
            </div>
          )}

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
              onClick={() => router.push('/admin')}
              className="flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Admin Home
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
