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
  Palette,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { CreditHistory } from '@/components/dashboard/CreditHistory';

const tools = [
  {
    name: 'Upscale',
    description: 'AI-powered enhancement',
    href: '/process?operation=upscale',
    icon: Upload,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    hoverBorder: 'hover:border-blue-200',
  },
  {
    name: 'Remove BG',
    description: 'Background removal',
    href: '/process?operation=background-removal',
    icon: Scissors,
    color: 'text-green-600',
    bg: 'bg-green-50',
    hoverBorder: 'hover:border-green-200',
  },
  {
    name: 'Change Colors',
    description: 'Replace colors',
    href: '/process/color-change',
    icon: Palette,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    hoverBorder: 'hover:border-amber-200',
  },
  {
    name: 'Vectorize',
    description: 'Scalable vectors',
    href: '/process?operation=vectorize',
    icon: Zap,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    hoverBorder: 'hover:border-purple-200',
  },
  {
    name: 'AI Generate',
    description: 'Create with AI',
    href: '/generate',
    icon: Sparkles,
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    hoverBorder: 'hover:border-pink-200',
  },
];

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
          <div className="mb-6">
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

          <div className="space-y-6">
            <CreditExpirationBanner />

            {/* Tools grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900">Quick Actions</h2>
                <Link href="/process" className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-0.5">
                  All tools <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                {tools.map(tool => (
                  <Link
                    key={tool.name}
                    href={tool.href}
                    className={`group relative flex flex-col items-center p-4 sm:p-5 rounded-xl border border-gray-200 bg-white ${tool.hoverBorder} hover:shadow-md transition-all`}
                  >
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 ${tool.bg} rounded-xl flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform`}>
                      <tool.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${tool.color}`} />
                    </div>
                    <h3 className="font-semibold text-gray-900 text-xs sm:text-sm text-center">{tool.name}</h3>
                    <p className="text-gray-400 text-[10px] sm:text-xs text-center mt-0.5 hidden sm:block">{tool.description}</p>
                  </Link>
                ))}
              </div>
            </div>

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

            {/* Credit History */}
            <Card>
              <CardHeader>
                <CardTitle>Credit History & Purchases</CardTitle>
              </CardHeader>
              <CardContent>
                <CreditHistory />
              </CardContent>
            </Card>
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
