'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  Image as ImageIcon,
  Clock,
  Shield
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';

interface StorageStats {
  totalImages: number;
  totalSize: number;
  usedStorage: number;
  storageLimit: number;
  percentageUsed: number;
  imagesByType: {
    upscale: number;
    'background-removal': number;
    vectorize: number;
    generate: number;
  };
  expiringImages: number;
  permanentImages: number;
}

export function StorageUsageCard() {
  const { user, profile } = useAuthStore();
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchStorageStats();
    }
  }, [user]);

  const fetchStorageStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/storage/stats');
      
      if (!response.ok) {
        throw new Error('Failed to fetch storage stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError('Failed to load storage statistics');
      console.error('Error fetching storage stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return null; // Simply don't show the card if there's an error
  }

  // Determine user status and image expiration rules
  const hasExpiringImages = stats.expiringImages > 0;
  const isPaidUser = profile?.subscription_plan && profile.subscription_plan !== 'free';
  const hasCredits = profile?.credits_remaining && profile.credits_remaining > 0;
  const hasPurchasedCredits = profile?.credit_expires_at ? new Date(profile.credit_expires_at) > new Date() : false;
  
  // Debug logging (remove in production)
  console.log('[StorageUsageCard] User status:', {
    subscription_plan: profile?.subscription_plan,
    credits_remaining: profile?.credits_remaining,
    credit_expires_at: profile?.credit_expires_at,
    isPaidUser,
    hasCredits,
    hasPurchasedCredits,
  });
  
  // Determine actual expiration policy
  const hasExtendedStorage = isPaidUser || hasPurchasedCredits;
  
  // For users with extended storage and no expiring images, don't show anything
  if (hasExtendedStorage && !hasExpiringImages) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Image Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Simple Stats */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Images</span>
            <span className="text-lg font-semibold">{stats.totalImages}</span>
          </div>

          {/* Expiration Warning - Show accurate message based on user's actual status */}
          {hasExpiringImages && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-900">
                    {stats.expiringImages} image{stats.expiringImages > 1 ? 's' : ''} expiring soon
                  </p>
                  <p className="text-amber-700">
                    {hasExtendedStorage 
                      ? 'Images will be deleted automatically' 
                      : 'Free plan images expire after 48 hours'}
                  </p>
                  {!hasExtendedStorage && (
                    <Link href="/pricing" className="font-medium text-amber-900 underline mt-1 inline-block">
                      Upgrade to keep images permanently
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Storage policy notice - Show accurate message */}
          {!hasExtendedStorage && !hasExpiringImages && stats.totalImages > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="text-blue-700">
                    Images on free plan expire after 48 hours.
                    <Link href="/pricing" className="font-medium underline ml-1">
                      Upgrade for permanent storage
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Show extended storage notice for users with purchased credits */}
          {hasPurchasedCredits && !isPaidUser && stats.totalImages > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-green-600 mt-0.5" />
                <div className="text-sm">
                  <p className="text-green-700">
                    Your images are protected for 90 days with your credit purchase.
                    {profile?.credit_expires_at && (
                      <span className="block mt-1 text-green-600">
                        Extended storage until: {new Date(profile.credit_expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}