'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { CreditHistory } from '@/components/credits/CreditHistory';
import { Loader2, RefreshCw, CreditCard, AlertCircle } from 'lucide-react';
import { env } from '@/config/env';

export default function TestCreditsPage() {
  const { user, profile } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [creditData, setCreditData] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchCreditData();
    }
  }, [user]);

  const fetchCreditData = async () => {
    try {
      const response = await fetch('/api/credits/history');
      const result = await response.json();
      if (result.success) {
        setCreditData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch credit data:', error);
    }
  };

  const resetCredits = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/cron/reset-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          secret: env.CRON_SECRET || 'test-cron-secret-123'
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMessage({ type: 'success', text: 'Credits reset successfully!' });
        // Refresh auth store to get new credit balance
        window.location.reload();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to reset credits' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  const testCreditUsage = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      // Simulate using credits (you can modify this to call actual processing)
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'upscale',
          testMode: true, // Add this flag to your API to skip actual processing
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Credit usage test completed!' });
        fetchCreditData();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to test credit usage' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-gray-600">Please log in to test the credit system</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Credit System Testing</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Email:</span> {user.email}
                </p>
                <p className="text-sm">
                  <span className="font-medium">User ID:</span> {user.id}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Credits:</span> {profile?.credits_remaining || 0}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Plan:</span> {profile?.subscription_status || 'free'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Test Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Test Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={resetCredits}
                disabled={isLoading}
                className="w-full"
                variant="outline"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset Credits (Free Tier)
                  </>
                )}
              </Button>

              <Button
                onClick={testCreditUsage}
                disabled={isLoading || (profile?.credits_remaining || 0) < 1}
                className="w-full"
                variant="outline"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Test Credit Usage (1 credit)
                  </>
                )}
              </Button>

              <Button
                onClick={fetchCreditData}
                disabled={isLoading}
                className="w-full"
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>
            </CardContent>
          </Card>

          {/* Credit Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Credit Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {creditData?.summary ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Total:</span> {creditData.summary.total_credits}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Active:</span> {creditData.summary.active_credits}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Rollover:</span> {creditData.summary.rollover_credits}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Purchases:</span> {creditData.summary.active_purchases}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500">Loading...</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Credit History Component */}
        <CreditHistory />

        {/* Raw Data Display (for debugging) */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Raw Credit Data (Debug)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto bg-gray-100 p-4 rounded">
              {JSON.stringify(creditData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}