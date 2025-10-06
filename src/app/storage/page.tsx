'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { StorageUsageCard } from '@/components/storage/StorageUsageCard';
import { StorageManager } from '@/components/storage/StorageManager';
import { StorageAnalytics } from '@/components/storage/StorageAnalytics';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tab } from '@headlessui/react';
import {
  HardDrive,
  BarChart3,
  Trash2,
  TrendingUp,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/lib/toast';

export default function StoragePage() {
  const router = useRouter();
  const { user, profile, loading, initialize } = useAuthStore();
  const [activeTab, setActiveTab] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!loading && !user) {
      toast.error('Please login to manage your storage');
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse">Loading storage management...</div>
        </div>
      </AppLayout>
    );
  }

  const handleStorageUpdate = () => {
    // Refresh all storage components
    setRefreshKey(prev => prev + 1);
  };

  const tabs = [
    { name: 'Overview', icon: HardDrive },
    { name: 'Manage Files', icon: Trash2 },
    { name: 'Analytics', icon: BarChart3 },
  ];

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Storage Management' },
            ]}
          />

          {/* Page Header */}
          <div className="mt-6 mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Storage Management
            </h1>
            <p className="mt-2 text-gray-600">
              Monitor and manage your image storage, track usage patterns, and
              optimize your space.
            </p>
          </div>

          {/* Storage Overview Card */}
          <div className="mb-8">
            <StorageUsageCard key={refreshKey} />
          </div>

          {/* Tab Navigation */}
          <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
            <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 p-1 mb-8">
              {tabs.map(tab => (
                <Tab
                  key={tab.name}
                  className={({ selected }) =>
                    `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
                    ${
                      selected
                        ? 'bg-white text-primary-blue shadow'
                        : 'text-gray-700 hover:bg-white/[0.12] hover:text-gray-900'
                    } 
                    transition-all duration-200 flex items-center justify-center gap-2`
                  }
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.name}
                </Tab>
              ))}
            </Tab.List>

            <Tab.Panels>
              {/* Overview Tab */}
              <Tab.Panel>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Storage Tips */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-500" />
                        Storage Tips
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                          <div>
                            <p className="font-medium">Regular Cleanup</p>
                            <p className="text-sm text-gray-600">
                              Delete processed images you no longer need to free
                              up space.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                          <div>
                            <p className="font-medium">
                              Download Important Files
                            </p>
                            <p className="text-sm text-gray-600">
                              Keep local copies of images you want to preserve
                              long-term.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                          <div>
                            <p className="font-medium">Monitor Usage</p>
                            <p className="text-sm text-gray-600">
                              Check your storage analytics regularly to avoid
                              surprises.
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Plan Benefits */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                        Your Plan Benefits
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <p className="font-medium text-lg capitalize">
                            {profile?.subscription_plan || 'Free'} Plan
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {profile?.subscription_plan === 'free'
                              ? '100 MB storage, 48-hour retention'
                              : profile?.subscription_plan === 'basic'
                                ? '1 GB storage, permanent retention'
                                : profile?.subscription_plan === 'starter'
                                  ? '5 GB storage, permanent retention'
                                  : '10 GB storage, permanent retention'}
                          </p>
                        </div>

                        {profile?.subscription_plan === 'free' && (
                          <>
                            <div className="border-t pt-4">
                              <p className="font-medium mb-2">
                                Upgrade Benefits:
                              </p>
                              <ul className="space-y-1 text-sm text-gray-600">
                                <li>• Permanent image storage</li>
                                <li>• 10x to 100x more space</li>
                                <li>• Priority processing</li>
                                <li>• No expiration worries</li>
                              </ul>
                            </div>
                            <Link href="/pricing">
                              <Button className="w-full">
                                <TrendingUp className="w-4 h-4 mr-2" />
                                View Upgrade Options
                              </Button>
                            </Link>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Storage Warnings */}
                {profile?.subscription_plan === 'free' && (
                  <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-yellow-900">
                          Free Plan Limitations
                        </h3>
                        <p className="text-yellow-800 mt-1">
                          Your images are automatically deleted after 48 hours
                          on the free plan. Upgrade to keep your images
                          permanently and get more storage space.
                        </p>
                        <Link href="/pricing">
                          <Button size="sm" className="mt-3">
                            Upgrade Now
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </Tab.Panel>

              {/* Manage Files Tab */}
              <Tab.Panel>
                <StorageManager onStorageUpdate={handleStorageUpdate} />
              </Tab.Panel>

              {/* Analytics Tab */}
              <Tab.Panel>
                <StorageAnalytics key={refreshKey} />
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        </div>
      </div>
    </AppLayout>
  );
}
