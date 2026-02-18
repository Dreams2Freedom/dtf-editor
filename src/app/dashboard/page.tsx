'use client';

import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ClientOnly } from '@/components/auth/ClientOnly';
import { LoadingPage } from '@/components/ui/LoadingPage';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { CancellationFlow } from '@/components/subscription/CancellationFlow';
import { PlanSwitcher } from '@/components/subscription/PlanSwitcher';
import { CreditExpirationBanner } from '@/components/credits/CreditExpirationBanner';
import { ImageGalleryEnhanced } from '@/components/image/ImageGalleryEnhanced';
import { StorageUsageCard } from '@/components/storage/StorageUsageCard';
import {
  Upload,
  Settings,
  CreditCard,
  Scissors,
  Zap,
  Crown,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { CreditHistory } from '@/components/dashboard/CreditHistory';

export default function DashboardPage() {
  const { user, profile, loading, initialize, refreshCredits } =
    useAuthStore();
  const router = useRouter();
  const [showCancellationFlow, setShowCancellationFlow] = useState(false);

  // Check if user has active subscription (not free plan)
  const hasActiveSubscription =
    profile?.subscription_plan && profile.subscription_plan !== 'free';

  useEffect(() => {
    // Initialize auth state on mount
    initialize();
  }, [initialize]);

  // Refresh credits when dashboard loads or regains focus
  useEffect(() => {
    if (user) {
      refreshCredits();

      // Refresh on window focus
      const handleFocus = () => refreshCredits();
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [user, refreshCredits]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          returnUrl: window.location.origin + '/dashboard',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Portal session error:', data);
        throw new Error(data.error || 'Failed to create portal session');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Manage subscription error:', error);
      alert(error.message || 'Unable to access subscription management. Please try again.');
    }
  };

  if (loading) {
    return <LoadingPage message="Loading your dashboard..." />;
  }

  if (!user) {
    return null; // Will redirect to login
  }

  // Handle missing profile gracefully
  if (!profile) {
    return (
      <ClientOnly fallback={<LoadingPage message="Initializing..." />}>
        <div className="min-h-screen bg-gray-50">
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-lg text-gray-700 mb-4">
                  Your profile is being set up. This may take a moment.
                </p>
                <p className="text-gray-600">
                  If this persists, please contact support.
                </p>
                <div className="mt-6">
                  <Button onClick={() => window.location.reload()}>
                    Refresh Page
                  </Button>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </ClientOnly>
    );
  }

  return (
    <ClientOnly fallback={<LoadingPage message="Initializing..." />}>
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">
              Welcome back,{' '}
              {profile?.first_name || user.email?.split('@')[0] || 'User'}!
            </p>
          </div>
          <div className="space-y-8">
            {/* Credit Expiration Warning */}
            <CreditExpirationBanner />

            {/* Quick Actions - Core image tools */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <Link href="/process?operation=upscale">
                  <CardContent className="p-5 text-center">
                    <Upload className="w-10 h-10 text-primary-600 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-900 mb-1">
                      Upscale
                    </h3>
                    <p className="text-gray-600 text-xs">
                      AI-powered enhancement
                    </p>
                  </CardContent>
                </Link>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <Link href="/process?operation=background-removal">
                  <CardContent className="p-5 text-center">
                    <Scissors className="w-10 h-10 text-accent-600 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-900 mb-1">
                      Remove BG
                    </h3>
                    <p className="text-gray-600 text-xs">
                      Clean background removal
                    </p>
                  </CardContent>
                </Link>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <Link href="/process?operation=vectorize">
                  <CardContent className="p-5 text-center">
                    <Zap className="w-10 h-10 text-accent-600 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-900 mb-1">
                      Vectorize
                    </h3>
                    <p className="text-gray-600 text-xs">
                      Convert to scalable vectors
                    </p>
                  </CardContent>
                </Link>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <Link href="/generate">
                  <CardContent className="p-5 text-center">
                    <Sparkles className="w-10 h-10 text-accent-600 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-900 mb-1">
                      AI Generate
                    </h3>
                    <p className="text-gray-600 text-xs">
                      Create images with AI
                    </p>
                  </CardContent>
                </Link>
              </Card>
            </div>

            {/* Account Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Account & Credits */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Account</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Credits</p>
                      <p className="text-2xl font-bold text-primary-600">
                        {profile.credits_remaining}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Plan</p>
                      <p className="text-lg font-medium capitalize">
                        {profile.subscription_plan || 'Free'}
                        {profile.subscription_paused_until && (
                          <span className="text-sm text-amber-600 ml-1">
                            (Paused)
                          </span>
                        )}
                      </p>
                      {profile.subscription_paused_until && (
                        <p className="text-xs text-gray-500">
                          Resumes{' '}
                          {new Date(
                            profile.subscription_paused_until
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="font-medium capitalize">
                        {profile.subscription_status || 'Active'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Member Since</p>
                      <p className="font-medium">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Upgrade prompt for free users */}
                  {!hasActiveSubscription && (
                    <div className="mt-4 pt-4 border-t">
                      <Link href="/pricing">
                        <Button className="w-full">
                          <CreditCard className="w-4 h-4 mr-2" />
                          Upgrade Plan
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Manage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {hasActiveSubscription && (
                    <>
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={handleManageSubscription}
                      >
                        <Crown className="w-4 h-4 mr-2" />
                        Manage Subscription
                      </Button>
                      <Button
                        variant="secondary"
                        className="w-full text-red-600 hover:text-red-700 hover:border-red-300"
                        onClick={() => setShowCancellationFlow(true)}
                      >
                        Cancel Subscription
                      </Button>
                    </>
                  )}

                  <Link href="/pricing" className="block">
                    <Button variant="secondary" className="w-full">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Get More Credits
                    </Button>
                  </Link>

                  <Link href="/settings" className="block">
                    <Button variant="secondary" className="w-full">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Image Status - Only shows for free users or when images are expiring */}
            <StorageUsageCard />

            {/* My Images Gallery */}
            <div id="my-images" className="mt-8">
              <ImageGalleryEnhanced />
            </div>

            {/* Plan Switcher - Only show for users with active subscriptions */}
            {hasActiveSubscription && (
              <Card>
                <CardHeader>
                  <CardTitle>Change Subscription Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <PlanSwitcher
                    currentPlan={profile.subscription_plan}
                    onPlanChange={() => {
                      // Refresh the page to show updated plan
                      window.location.reload();
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Credit History */}
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>Credit History & Purchases</CardTitle>
                </CardHeader>
                <CardContent>
                  <CreditHistory />
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Cancellation Flow Modal */}
      {profile && hasActiveSubscription && (
        <CancellationFlow
          isOpen={showCancellationFlow}
          onClose={() => setShowCancellationFlow(false)}
          onComplete={() => {
            setShowCancellationFlow(false);
            // Refresh the page to show updated subscription status
            window.location.reload();
          }}
          subscription={{
            plan: profile.subscription_plan || 'basic',
            nextBillingDate: new Date().toISOString(), // TODO: Get from Stripe
          }}
        />
      )}
    </ClientOnly>
  );
}
