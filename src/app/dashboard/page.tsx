'use client';

import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ClientOnly } from '@/components/auth/ClientOnly';
import { LoadingPage } from '@/components/ui/LoadingPage';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { CreditDisplay } from '@/components/ui/CreditDisplay';
import { CancellationFlow } from '@/components/subscription/CancellationFlow';
import { PlanSwitcher } from '@/components/subscription/PlanSwitcher';
import { CreditExpirationBanner } from '@/components/credits/CreditExpirationBanner';
import { ImageGalleryEnhanced } from '@/components/image/ImageGalleryEnhanced';
import { StorageUsageCard } from '@/components/storage/StorageUsageCard';
import { StorageManager } from '@/components/storage/StorageManager';
import { 
  Upload, 
  Wand2, 
  BarChart3, 
  Settings,
  CreditCard,
  LogOut,
  Scissors,
  Zap,
  Crown,
  PauseCircle,
  Images,
  HardDrive,
  Sparkles,
  Calculator
} from 'lucide-react';
import Link from 'next/link';
import { CreditHistory } from '@/components/dashboard/CreditHistory';

export default function DashboardPage() {
  const { user, profile, loading, signOut, initialize, refreshCredits } = useAuthStore();
  const router = useRouter();
  const [showCancellationFlow, setShowCancellationFlow] = useState(false);
  const [storageKey, setStorageKey] = useState(0); // For refreshing storage stats
  
  // Check if user has active subscription (not free plan)
  const hasActiveSubscription = profile?.subscription_plan && profile.subscription_plan !== 'free';
  
  const refreshStorageStats = () => {
    setStorageKey(prev => prev + 1);
  };

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

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          returnUrl: window.location.origin + '/dashboard',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      alert('Unable to access subscription management. Please try again.');
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
            <p className="text-gray-600">Welcome back, {profile?.first_name || user.email?.split('@')[0] || 'User'}!</p>
          </div>
        <div className="space-y-8">
          {/* Credit Expiration Warning */}
          <CreditExpirationBanner />
          
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <Link href="/process?operation=upscale">
                <CardContent className="p-6 text-center">
                  <Upload className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Upscale Image
                  </h3>
                  <p className="text-gray-600 text-sm">
                    AI-powered image enhancement
                  </p>
                </CardContent>
              </Link>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <Link href="/process?operation=background-removal">
                <CardContent className="p-6 text-center">
                  <Scissors className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Remove Background
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Clean background removal
                  </p>
                </CardContent>
              </Link>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <Link href="/process?operation=vectorize">
                <CardContent className="p-6 text-center">
                  <Zap className="w-12 h-12 text-orange-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Vectorize
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Convert to scalable vectors
                  </p>
                </CardContent>
              </Link>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <Link href="/generate">
                <CardContent className="p-6 text-center">
                  <Sparkles className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    AI Generate
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Create images with AI
                  </p>
                </CardContent>
              </Link>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <Link href="/tools/dpi-checker">
                <CardContent className="p-6 text-center">
                  <Calculator className="w-12 h-12 text-teal-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    DPI Checker
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Check image resolution
                  </p>
                </CardContent>
              </Link>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <Link href="/pricing?tab=payasyougo">
                <CardContent className="p-6 text-center">
                  <CreditCard className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Buy Credits
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Purchase processing credits
                  </p>
                </CardContent>
              </Link>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <Link href="#my-images">
                <CardContent className="p-6 text-center">
                  <Images className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    My Images
                  </h3>
                  <p className="text-gray-600 text-sm">
                    View processed images
                  </p>
                </CardContent>
              </Link>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <Link href="/storage">
                <CardContent className="p-6 text-center">
                  <HardDrive className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Storage
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Manage your storage
                  </p>
                </CardContent>
              </Link>
            </Card>
          </div>

          {/* Account Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
                {profile.first_name && (
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">
                      {profile.first_name} {profile.last_name}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Plan</p>
                  <p className="font-medium capitalize">
                    {profile.subscription_status}
                    {profile.subscription_paused_until && (
                      <span className="text-sm text-amber-600 ml-2">
                        (Paused)
                      </span>
                    )}
                  </p>
                  {profile.subscription_paused_until && (
                    <p className="text-xs text-gray-500 mt-1">
                      Resumes {new Date(profile.subscription_paused_until).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Member Since</p>
                  <p className="font-medium">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usage Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Credits Remaining</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {profile.credits_remaining}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Subscription Plan</p>
                  <p className="text-lg font-medium capitalize">
                    {profile.subscription_plan}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Account Status</p>
                  <p className="text-lg font-medium capitalize">
                    Active
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/process">
                  <Button className="w-full">
                    <Wand2 className="w-4 h-4 mr-2" />
                    Process Image
                  </Button>
                </Link>
                
                <Link href="/pricing?tab=payasyougo">
                  <Button variant="outline" className="w-full">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Buy Credits
                  </Button>
                </Link>
                
                {hasActiveSubscription && (
                  <>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={handleManageSubscription}
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Manage Subscription
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full text-red-600 hover:text-red-700 hover:border-red-300" 
                      onClick={() => setShowCancellationFlow(true)}
                    >
                      Cancel Subscription
                    </Button>
                  </>
                )}
                
                <Link href="/settings">
                  <Button variant="outline" className="w-full">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Storage Management Section */}
          <div id="storage" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div key={storageKey}>
              <StorageUsageCard />
            </div>
            <div>
              <StorageManager onStorageUpdate={refreshStorageStats} />
            </div>
          </div>

          {/* My Images Gallery */}
          <div id="my-images" className="mt-8">
            <ImageGalleryEnhanced />
          </div>

          {/* Plan Switcher - Only show for users with active subscriptions */}
          {hasActiveSubscription && profile.subscription_plan !== 'free' && (
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

          {/* Credit Analytics - Disabled due to missing tables */}
          {/* <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Credit Usage Analytics</h2>
            <CreditAnalytics />
          </div> */}

          {/* Processing History - Disabled due to missing tables */}
          {/* <ProcessingHistory limit={10} /> */}

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
          nextBillingDate: new Date().toISOString() // TODO: Get from Stripe
        }}
      />
    )}
    </ClientOnly>
  );
}