'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  TrendingUp, 
  TrendingDown, 
  HardDrive,
  FileImage,
  Calendar,
  PieChart,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/lib/toast';

interface StorageAnalytics {
  usage: {
    current: number;
    limit: number;
    percentage: number;
    trend: number; // percentage change from last month
  };
  growth: {
    daily: Array<{ date: string; size: number; count: number }>;
    monthly: Array<{ month: string; size: number; count: number }>;
  };
  breakdown: {
    byType: Array<{ type: string; size: number; count: number; percentage: number }>;
    byAge: Array<{ range: string; size: number; count: number }>;
  };
  predictions: {
    daysUntilFull: number | null;
    recommendedAction: string;
    projectedUsageNextMonth: number;
  };
}

export function StorageAnalytics() {
  const { user, profile } = useAuthStore();
  const [analytics, setAnalytics] = useState<StorageAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/storage/analytics?range=${timeRange}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch storage analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching storage analytics:', error);
      toast.error('Failed to load storage analytics');
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'upscale':
        return '🔍';
      case 'background-removal':
        return '✂️';
      case 'vectorize':
        return '🎨';
      case 'generate':
        return '🤖';
      default:
        return '📄';
    }
  };

  if (loading || !analytics) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Simple bar chart component
  const MiniChart = ({ data, valueKey }: { data: any[]; valueKey: string }) => {
    const maxValue = Math.max(...data.map(d => d[valueKey]));
    
    return (
      <div className="flex items-end justify-between gap-1 h-20">
        {data.slice(-7).map((item, index) => {
          const percentage = maxValue > 0 ? (item[valueKey] / maxValue) * 100 : 0;
          return (
            <div key={index} className="flex-1 flex flex-col items-center justify-end">
              <div 
                className="w-full bg-primary-blue rounded-t transition-all duration-300 hover:bg-blue-600"
                style={{ height: `${percentage}%` }}
              />
              <div className="text-xs text-gray-500 mt-1">
                {item.date ? new Date(item.date).getDate() : index + 1}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Storage Analytics</h2>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-primary-blue text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Usage</p>
                <p className="text-xl font-semibold">{formatBytes(analytics.usage.current)}</p>
                <p className="text-xs text-gray-500">of {formatBytes(analytics.usage.limit)}</p>
              </div>
              <HardDrive className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Growth Rate</p>
                <p className={`text-xl font-semibold ${analytics.usage.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analytics.usage.trend >= 0 ? '+' : ''}{analytics.usage.trend.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">vs last month</p>
              </div>
              {analytics.usage.trend >= 0 ? (
                <TrendingUp className="w-8 h-8 text-green-500" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Days Until Full</p>
                <p className="text-xl font-semibold">
                  {analytics.predictions.daysUntilFull || 'N/A'}
                </p>
                <p className="text-xs text-gray-500">at current rate</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Projected Next Month</p>
                <p className="text-xl font-semibold">
                  {formatBytes(analytics.predictions.projectedUsageNextMonth)}
                </p>
                <p className="text-xs text-gray-500">estimated usage</p>
              </div>
              <PieChart className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Trend and Type Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Usage Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Storage Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <MiniChart data={analytics.growth.daily} valueKey="size" />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Avg Daily Growth</p>
                  <p className="font-semibold">
                    {formatBytes(
                      analytics.growth.daily.reduce((sum, d) => sum + d.size, 0) / 
                      analytics.growth.daily.length
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Avg Images/Day</p>
                  <p className="font-semibold">
                    {Math.round(
                      analytics.growth.daily.reduce((sum, d) => sum + d.count, 0) / 
                      analytics.growth.daily.length
                    )}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Storage by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Storage by Operation Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.breakdown.byType.map((type, index) => (
                <div key={index}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span>{getTypeIcon(type.type)}</span>
                      <span className="capitalize">{type.type.replace('-', ' ')}</span>
                    </span>
                    <span className="text-sm text-gray-600">
                      {formatBytes(type.size)} ({type.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-blue h-2 rounded-full transition-all duration-300"
                      style={{ width: `${type.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{type.count} images</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Age Distribution and Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage by Age */}
        <Card>
          <CardHeader>
            <CardTitle>Storage by Age</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.breakdown.byAge.map((age, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{age.range}</p>
                    <p className="text-sm text-gray-600">{age.count} images</p>
                  </div>
                  <p className="font-semibold">{formatBytes(age.size)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="font-medium text-blue-900 mb-2">Storage Optimization</p>
                <p className="text-sm text-blue-700">{analytics.predictions.recommendedAction}</p>
              </div>
              
              {analytics.predictions.daysUntilFull && analytics.predictions.daysUntilFull < 30 && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="font-medium text-yellow-900 mb-2">Storage Warning</p>
                  <p className="text-sm text-yellow-700">
                    At your current usage rate, you'll reach your storage limit in {analytics.predictions.daysUntilFull} days.
                    Consider cleaning up old images or upgrading your plan.
                  </p>
                </div>
              )}

              {profile?.subscription_plan === 'free' && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="font-medium text-purple-900 mb-2">Upgrade Benefit</p>
                  <p className="text-sm text-purple-700">
                    Upgrading to a paid plan gives you permanent storage and up to 10GB of space.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}