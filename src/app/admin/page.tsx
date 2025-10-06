'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { KPIDashboard } from '@/components/admin/analytics/KPIDashboard';
import { toast } from '@/lib/toast';
import {
  Users,
  DollarSign,
  CreditCard,
  Activity,
  ArrowUp,
  ArrowDown,
  TrendingUp,
} from 'lucide-react';
import type { AdminDashboardStats } from '@/types/admin';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin, initialize } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      // Initialize auth state if not already done
      if (!user) {
        await initialize();
      }

      // Get fresh state after initialization
      const state = useAuthStore.getState();

      // Check if user is authenticated
      if (!state.user) {
        toast.error('Please login to access admin dashboard');
        router.push('/admin/login');
        return;
      }

      // Check if user is admin
      if (!state.isAdmin) {
        toast.error('Access denied. Admin privileges required.');
        console.log('User profile:', state.profile);
        console.log('Is admin?', state.isAdmin);
        router.push('/dashboard');
        return;
      }

      // User is authenticated and is admin
      toast.success('Welcome to Admin Dashboard');

      // Fetch real stats from API
      fetchDashboardStats();
    };

    checkAuth();
  }, [router, initialize]);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard/stats', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const StatCard = ({
    title,
    value,
    change,
    icon: Icon,
    trend = 'up',
    prefix = '',
    suffix = '',
  }: {
    title: string;
    value: number | string;
    change?: number;
    icon: React.ComponentType<{ className?: string }>;
    trend?: 'up' | 'down';
    prefix?: string;
    suffix?: string;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {prefix}
              {typeof value === 'number' ? value.toLocaleString() : value}
              {suffix}
            </p>
            {change !== undefined && (
              <p
                className={`text-sm mt-2 flex items-center ${
                  trend === 'up' ? 'text-success-600' : 'text-error-600'
                }`}
              >
                {trend === 'up' ? (
                  <ArrowUp className="w-4 h-4 mr-1" />
                ) : (
                  <ArrowDown className="w-4 h-4 mr-1" />
                )}
                {Math.abs(change)}% from last period
              </p>
            )}
          </div>
          <div
            className={`p-3 rounded-full ${
              trend === 'up' ? 'bg-success-100' : 'bg-info-100'
            }`}
          >
            <Icon
              className={`w-6 h-6 ${
                trend === 'up' ? 'text-success-600' : 'text-info-600'
              }`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading || !stats) {
    return (
      <AdminLayout>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard Overview
          </h1>
          <p className="text-gray-600">
            Welcome back! Here's what's happening with your platform.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Users"
            value={stats.users.total}
            change={12}
            icon={Users}
            trend="up"
          />
          <StatCard
            title="Monthly Revenue"
            value={formatCurrency(stats.revenue.mrr)}
            change={8}
            icon={DollarSign}
            trend="up"
          />
          <StatCard
            title="Active Today"
            value={stats.users.active_today}
            change={-5}
            icon={Activity}
            trend="down"
          />
          <StatCard
            title="Success Rate"
            value={stats.processing.success_rate}
            suffix="%"
            icon={TrendingUp}
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Today</span>
                  <span className="font-semibold">
                    {formatCurrency(stats.revenue.today)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">This Week</span>
                  <span className="font-semibold">
                    {formatCurrency(stats.revenue.week)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">This Month</span>
                  <span className="font-semibold">
                    {formatCurrency(stats.revenue.month)}
                  </span>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Annual Recurring</span>
                    <span className="font-bold text-lg">
                      {formatCurrency(stats.revenue.arr)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Processing Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Processing Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Images Today</span>
                  <span className="font-semibold">
                    {stats.processing.images_today}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Images This Week</span>
                  <span className="font-semibold">
                    {stats.processing.images_week}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Avg Processing Time</span>
                  <span className="font-semibold">
                    {stats.processing.avg_processing_time}s
                  </span>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Success Rate</span>
                    <span className="font-bold text-lg text-success-600">
                      {stats.processing.success_rate}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                onClick={() => router.push('/admin/users')}
                className="flex flex-col items-center justify-center p-4 h-auto"
              >
                <Users className="w-6 h-6 mb-2 text-primary-500" />
                <span className="text-sm font-medium">View All Users</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/admin/transactions')}
                className="flex flex-col items-center justify-center p-4 h-auto"
              >
                <DollarSign className="w-6 h-6 mb-2 text-primary-500" />
                <span className="text-sm font-medium">Recent Transactions</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/admin/coupons')}
                className="flex flex-col items-center justify-center p-4 h-auto"
              >
                <CreditCard className="w-6 h-6 mb-2 text-primary-500" />
                <span className="text-sm font-medium">Create Coupon</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/admin/system')}
                className="flex flex-col items-center justify-center p-4 h-auto"
              >
                <Activity className="w-6 h-6 mb-2 text-primary-500" />
                <span className="text-sm font-medium">System Status</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* KPI Dashboard */}
        <KPIDashboard />
      </div>
    </AdminLayout>
  );
}
