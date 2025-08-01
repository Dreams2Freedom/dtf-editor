'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  HardDrive, 
  AlertTriangle, 
  TrendingUp,
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

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUsageColor = (percentage: number): string => {
    if (percentage < 50) return 'text-green-600';
    if (percentage < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressBarColor = (percentage: number): string => {
    if (percentage < 50) return 'bg-green-600';
    if (percentage < 80) return 'bg-yellow-600';
    return 'bg-red-600';
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
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <HardDrive className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>{error || 'Unable to load storage information'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const shouldShowWarning = stats.percentageUsed >= 80;
  const shouldShowCritical = stats.percentageUsed >= 95;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Storage Usage
          </span>
          {shouldShowCritical && (
            <AlertTriangle className="w-5 h-5 text-red-600" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Storage Bar */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">
                {formatBytes(stats.usedStorage)} used
              </span>
              <span className="text-gray-500">
                {formatBytes(stats.storageLimit)} limit
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${getProgressBarColor(stats.percentageUsed)}`}
                style={{ width: `${Math.min(stats.percentageUsed, 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className={`text-sm font-medium ${getUsageColor(stats.percentageUsed)}`}>
                {stats.percentageUsed.toFixed(1)}% used
              </span>
              {profile?.subscription_plan && profile.subscription_plan !== 'free' && (
                <span className="text-xs text-gray-500">
                  {profile.subscription_plan} plan
                </span>
              )}
            </div>
          </div>

          {/* Warning Messages */}
          {shouldShowCritical && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-red-900">Storage Nearly Full!</p>
                  <p className="text-red-700">
                    You're using {stats.percentageUsed.toFixed(0)}% of your storage. 
                    Consider deleting old images or upgrading your plan.
                  </p>
                </div>
              </div>
            </div>
          )}

          {shouldShowWarning && !shouldShowCritical && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-900">Storage Warning</p>
                  <p className="text-yellow-700">
                    You're approaching your storage limit.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Storage Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <ImageIcon className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">Total Images</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalImages}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">Expiring</span>
              </div>
              <p className="text-2xl font-bold">{stats.expiringImages}</p>
            </div>
          </div>

          {/* Image Type Breakdown */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Images by Type</h4>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Upscaled</span>
                <span className="font-medium">{stats.imagesByType.upscale}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Background Removed</span>
                <span className="font-medium">{stats.imagesByType['background-removal']}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Vectorized</span>
                <span className="font-medium">{stats.imagesByType.vectorize}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Generated</span>
                <span className="font-medium">{stats.imagesByType.generate}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {(shouldShowWarning || profile?.subscription_plan === 'free') && (
            <div className="pt-2 space-y-2">
              {profile?.subscription_plan === 'free' && (
                <Link href="/pricing" className="block">
                  <Button className="w-full" size="sm">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Upgrade for More Storage
                  </Button>
                </Link>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => window.location.href = '/dashboard?tab=images'}
              >
                Manage Images
              </Button>
            </div>
          )}

          {/* Free User Notice */}
          {profile?.subscription_plan === 'free' && stats.expiringImages > 0 && (
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="text-blue-700">
                    {stats.expiringImages} image{stats.expiringImages > 1 ? 's' : ''} will expire in 48 hours.
                    <Link href="/pricing" className="font-medium underline ml-1">
                      Upgrade to keep them permanently
                    </Link>
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