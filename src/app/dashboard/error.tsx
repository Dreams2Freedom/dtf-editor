'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AlertCircle, RefreshCw, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Dashboard error:', error);
  }, [error]);

  const handleLogout = () => {
    // Clear any potentially corrupted session data
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-md w-full">
        <div className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Dashboard Error
          </h1>

          <p className="text-gray-600 mb-6">
            We're having trouble loading your dashboard. This might be a
            temporary issue. Please try refreshing the page or logging in again.
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
              onClick={handleLogout}
              className="flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Re-login
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
