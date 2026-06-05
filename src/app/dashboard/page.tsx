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
  Settings,
  CreditCard,
  Crown,
} from 'lucide-react';
import Link from 'next/link';
import { ToolQuickActions } from '@/components/dashboard/ToolQuickActions';
import { DashboardImageGalleryPreview } from '@/components/dashboard/DashboardImageGalleryPreview';
import { HelpModal } from '@/components/ui/HelpModal';

export default function DashboardPage() {
  const { user, profile, loading, initialize, refreshCredits } =
    useAuthStore();
  const router = useRouter();
  const [showCancellationFlow, setShowCancellationFlow] = useState(false);

  const hasActiveSubscription =
    profile?.subscription_plan && profile.subscription_plan !== 'free';

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user) {
      refreshCredits();
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          returnUrl: window.location.origin + '/dashboard',
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create portal session');
      if (data.url) window.location.href = data.url;
    } catch (error: any) {
      console.error('Manage subscription error:', error);
      alert(error.message || 'Unable to access subscription management.');
    }
  };

  if (loading) return <LoadingPage message="Loading your dashboard..." />;
  if (!user) return null;

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
                <Button onClick={() => window.location.reload()}>
                  Refresh Page
                </Button>
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
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Welcome header */}
          <div className="flex items-center gap-2 mb-6">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Welcome back, {profile?.first_name || user.email?.split('@')[0] || 'there'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {profile.credits_remaining} credits remaining
                {profile.subscription_plan && profile.subscription_plan !== 'free' && (
                  <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium capitalize">
                    {profile.subscription_plan} plan
                  </span>
                )}
              </p>
            </div>
            <HelpModal
              storageKey="help_dashboard"
              title="Your Dashboard"
              accentColor="text-blue-600"
              accentBg="bg-blue-500"
              steps={[
                { title: 'Quick Actions', content: 'Use the tool cards at the top to quickly access any image processing tool. Each card takes you directly to the tool.' },
                { title: 'Your Account', content: 'View your credit balance, subscription plan, and account status. Upgrade your plan or purchase more credits here.' },
                { title: 'My Images', content: 'All your processed images are saved in your gallery. You can download, delete, or send them to other tools for further processing.' },
                { title: 'Credit History', content: 'Track all your credit purchases and usage at the bottom of the page.' },
              ]}
              tips={[
                "Your images are stored permanently — they won't expire.",
                'Use the search and filter options in My Images to find specific files.',
                'You can process images further by clicking Download or using the tool links in your gallery.',
              ]}
            />
          </div>

          <div className="space-y-6">
            <CreditExpirationBanner />

            {/* Tool quick actions — prominent, always-visible tool shortcuts */}
            <ToolQuickActions />

            {/* Image gallery preview — recent artwork + link to full gallery */}
            <DashboardImageGalleryPreview />

            {/* Account overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Your Account</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Credits</p>
                      <p className="text-2xl font-bold text-amber-600">
                        {profile.credits_remaining}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Plan</p>
                      <p className="text-lg font-medium capitalize">
                        {profile.subscription_plan || 'Free'}
                        {(profile as any).subscription_paused_until && (
                          <span className="text-xs text-amber-600 ml-1">(Paused)</span>
                        )}
                      </p>
                      {(profile as any).subscription_paused_until && (
                        <p className="text-xs text-gray-400">
                          Resumes {new Date((profile as any).subscription_paused_until).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <p className="font-medium capitalize text-sm">
                        {profile.subscription_status || 'Active'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Member Since</p>
                      <p className="font-medium text-sm">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {!hasActiveSubscription && (
                    <div className="mt-4 pt-4 border-t">
                      <Link href="/pricing">
                        <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                          <CreditCard className="w-4 h-4 mr-2" />
                          Upgrade Plan
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Manage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {hasActiveSubscription && (
                    <>
                      <Button
                        variant="secondary"
                        className="w-full justify-start"
                        onClick={handleManageSubscription}
                      >
                        <Crown className="w-4 h-4 mr-2" />
                        Manage Subscription
                      </Button>
                      <Button
                        variant="secondary"
                        className="w-full justify-start text-red-600 hover:text-red-700 hover:border-red-300"
                        onClick={() => setShowCancellationFlow(true)}
                      >
                        Cancel Subscription
                      </Button>
                    </>
                  )}
                  <Link href="/pricing" className="block">
                    <Button variant="secondary" className="w-full justify-start">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Get More Credits
                    </Button>
                  </Link>
                  <Link href="/settings" className="block">
                    <Button variant="secondary" className="w-full justify-start">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            <StorageUsageCard />

            {/* Gallery */}
            <div id="my-images">
              <ImageGalleryEnhanced />
            </div>

            {/* Plan Switcher */}
            {hasActiveSubscription && (
              <Card>
                <CardHeader>
                  <CardTitle>Change Subscription Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <PlanSwitcher
                    currentPlan={profile.subscription_plan}
                    onPlanChange={() => window.location.reload()}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>

      {profile && hasActiveSubscription && (
        <CancellationFlow
          isOpen={showCancellationFlow}
          onClose={() => setShowCancellationFlow(false)}
          onComplete={() => {
            setShowCancellationFlow(false);
            window.location.reload();
          }}
          subscription={{
            plan: profile.subscription_plan || 'basic',
            nextBillingDate: new Date().toISOString(),
          }}
        />
      )}
    </ClientOnly>
  );
}
