'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  Users,
  Activity,
  Clock,
  TrendingUp,
  Calendar,
  BarChart3,
  UserCheck,
  Globe,
} from 'lucide-react';
import { toast } from '@/lib/toast';

interface ActiveUserData {
  current: {
    activeNow: number;
    activeToday: number;
    activeThisWeek: number;
    activeThisMonth: number;
  };
  trends: {
    dailyActive: Array<{ date: string; count: number }>;
    hourlyDistribution: Array<{ hour: number; count: number }>;
    deviceTypes: Array<{ type: string; count: number; percentage: number }>;
  };
  engagement: {
    avgSessionDuration: number;
    avgPageViews: number;
    bounceRate: number;
    returningUsers: number;
  };
  geographic: Array<{
    country: string;
    count: number;
    percentage: number;
  }>;
}

export function ActiveUserMetrics() {
  const [data, setData] = useState<ActiveUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    fetchActiveUserData();
  }, [timeRange]);

  const fetchActiveUserData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/analytics/active-users?range=${timeRange}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch active user data');
      }

      const data = await response.json();
      setData(data);
    } catch (error) {
      console.error('Error fetching active user data:', error);
      toast.error('Failed to load active user metrics');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m ${seconds % 60}s`;
  };

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Simple bar visualization
  const ActivityBar = ({
    value,
    maxValue,
  }: {
    value: number;
    maxValue: number;
  }) => {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-primary-blue h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Active User Metrics
        </h2>
        <div className="flex gap-2">
          {(['24h', '7d', '30d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-primary-blue text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === '24h'
                ? '24 Hours'
                : range === '7d'
                  ? '7 Days'
                  : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Current Active Users */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Now</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.current.activeNow}
                </p>
                <p className="text-xs text-gray-500 mt-1">Last 5 minutes</p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.current.activeToday}
                </p>
                <p className="text-xs text-gray-500 mt-1">Unique users</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.current.activeThisWeek}
                </p>
                <p className="text-xs text-gray-500 mt-1">7-day active</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.current.activeThisMonth}
                </p>
                <p className="text-xs text-gray-500 mt-1">30-day active</p>
              </div>
              <Users className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>User Engagement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600">Avg Session Duration</p>
              <p className="text-xl font-semibold mt-1">
                {formatDuration(data.engagement.avgSessionDuration)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Page Views</p>
              <p className="text-xl font-semibold mt-1">
                {data.engagement.avgPageViews.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Bounce Rate</p>
              <p className="text-xl font-semibold mt-1">
                {data.engagement.bounceRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Returning Users</p>
              <p className="text-xl font-semibold mt-1">
                {data.engagement.returningUsers}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Active Users Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.trends.dailyActive.slice(-7).map((day, index) => {
                const maxCount = Math.max(
                  ...data.trends.dailyActive.map(d => d.count)
                );
                return (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">{day.date}</span>
                      <span className="text-sm font-medium">
                        {day.count} users
                      </span>
                    </div>
                    <ActivityBar value={day.count} maxValue={maxCount} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Hourly Activity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Activity by Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div
                className="grid grid-cols-24 gap-1"
                style={{ gridTemplateColumns: 'repeat(24, 1fr)' }}
              >
                {data.trends.hourlyDistribution.map((hour, index) => {
                  const maxCount = Math.max(
                    ...data.trends.hourlyDistribution.map(h => h.count)
                  );
                  const height =
                    maxCount > 0 ? (hour.count / maxCount) * 100 : 0;

                  return (
                    <div key={index} className="relative group">
                      <div
                        className="w-full bg-gray-200 rounded-t"
                        style={{ height: '60px' }}
                      >
                        <div
                          className="w-full bg-primary-blue rounded-t transition-all duration-300 hover:bg-blue-600"
                          style={{
                            height: `${height}%`,
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                          }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 text-center mt-1">
                        {hour.hour}
                      </div>
                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        {hour.count} users at {hour.hour}:00
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 text-center">
                Hour of day (24h format)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Types */}
        <Card>
          <CardHeader>
            <CardTitle>Device Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.trends.deviceTypes.map((device, index) => (
                <div key={index}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium capitalize">
                      {device.type}
                    </span>
                    <span className="text-sm text-gray-600">
                      {device.count} ({device.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        device.type === 'desktop'
                          ? 'bg-blue-500'
                          : device.type === 'mobile'
                            ? 'bg-green-500'
                            : 'bg-purple-500'
                      }`}
                      style={{ width: `${device.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Geographic Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Top Countries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.geographic.slice(0, 5).map((country, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-blue text-white flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <span className="font-medium">{country.country}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{country.count}</p>
                    <p className="text-xs text-gray-500">
                      {country.percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
