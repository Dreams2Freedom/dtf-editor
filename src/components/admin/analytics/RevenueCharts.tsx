'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Users,
  CreditCard,
  Activity,
} from 'lucide-react';
import { toast } from '@/lib/toast';

interface RevenueData {
  daily: Array<{ date: string; revenue: number; transactions: number }>;
  monthly: Array<{
    month: string;
    revenue: number;
    mrr: number;
    new_customers: number;
  }>;
  planDistribution: Array<{ plan: string; count: number; revenue: number }>;
  topCustomers: Array<{
    id: string;
    email: string;
    total_spent: number;
    subscription_plan: string;
    created_at: string;
  }>;
  metrics: {
    total_revenue: number;
    mrr: number;
    arr: number;
    average_order_value: number;
    ltv: number;
    growth_rate: number;
  };
}

export function RevenueCharts() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>(
    '30d'
  );

  useEffect(() => {
    fetchRevenueData();
  }, [timeRange]);

  const fetchRevenueData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/analytics/revenue?range=${timeRange}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch revenue data');
      }

      const data = await response.json();
      setData(data);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      toast.error('Failed to load revenue analytics');
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

  const formatPercent = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (loading || !data) {
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
  const BarChart = ({
    data,
    valueKey,
    labelKey,
    height = 200,
  }: {
    data: any[];
    valueKey: string;
    labelKey: string;
    height?: number;
  }) => {
    const maxValue = Math.max(...data.map(d => d[valueKey]));

    return (
      <div className="relative" style={{ height }}>
        <div className="absolute inset-0 flex items-end justify-between gap-1">
          {data.map((item, index) => {
            const percentage = (item[valueKey] / maxValue) * 100;
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="text-xs text-gray-600 mb-1">
                  {valueKey === 'revenue'
                    ? formatCurrency(item[valueKey])
                    : item[valueKey]}
                </div>
                <div
                  className="w-full bg-primary-blue rounded-t transition-all duration-300 hover:bg-blue-600"
                  style={{ height: `${percentage}%` }}
                />
                <div className="text-xs text-gray-500 mt-1 truncate w-full text-center">
                  {item[labelKey]}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Revenue Analytics
        </h2>
        <div className="flex gap-2">
          {(['7d', '30d', '90d', '1y'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-primary-blue text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === '7d'
                ? '7 Days'
                : range === '30d'
                  ? '30 Days'
                  : range === '90d'
                    ? '90 Days'
                    : '1 Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Revenue</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(data.metrics.total_revenue)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">MRR</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(data.metrics.mrr)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">ARR</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(data.metrics.arr)}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Avg Order</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(data.metrics.average_order_value)}
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">LTV</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(data.metrics.ltv)}
                </p>
              </div>
              <Users className="w-8 h-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Growth</p>
                <p
                  className={`text-lg font-semibold ${
                    data.metrics.growth_rate >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {formatPercent(data.metrics.growth_rate)}
                </p>
              </div>
              {data.metrics.growth_rate >= 0 ? (
                <TrendingUp className="w-8 h-8 text-green-500" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {data.daily.length > 0 ? (
              <BarChart
                data={data.daily.slice(-7)}
                valueKey="revenue"
                labelKey="date"
              />
            ) : (
              <p className="text-gray-500 text-center py-8">
                No revenue data available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {data.monthly.length > 0 ? (
              <BarChart
                data={data.monthly.slice(-6)}
                valueKey="mrr"
                labelKey="month"
              />
            ) : (
              <p className="text-gray-500 text-center py-8">
                No monthly data available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.planDistribution.map((plan, index) => {
                const percentage =
                  data.metrics.mrr > 0
                    ? (plan.revenue / data.metrics.mrr) * 100
                    : 0;

                return (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium capitalize">
                        {plan.plan}
                      </span>
                      <span className="text-sm text-gray-600">
                        {formatCurrency(plan.revenue)} ({plan.count} users)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-blue h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topCustomers.map((customer, index) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-blue text-white flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                        {customer.email}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {customer.subscription_plan} plan
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(customer.total_spent)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
