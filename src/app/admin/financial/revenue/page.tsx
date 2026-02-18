'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Users,
  CreditCard,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface RevenueMetrics {
  totalRevenue: number;
  mrr: number;
  arr: number;
  avgOrderValue: number;
  ltv: number;
  churnRate: number;
  growthRate: number;
  totalUsers: number;
  payingCustomers: number;
  subscribers: number;
  payPerUseCustomers: number;
  conversionRate: number;
}

interface RevenueBreakdown {
  subscriptions: number;
  oneTimePurchases: number;
  refunds: number;
  net: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  subscriptions: number;
  purchases: number;
  customers: number;
}

interface PlanDistribution {
  plan: string;
  count: number;
  revenue: number;
  percentage: number;
}

export default function RevenuePage() {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [breakdown, setBreakdown] = useState<RevenueBreakdown | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyRevenue[]>([]);
  const [planDistribution, setPlanDistribution] = useState<PlanDistribution[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<string>('30d');

  useEffect(() => {
    const fetchData = async () => {
      await fetchRevenueData();
    };
    fetchData();
  }, [dateRange]);

  const fetchRevenueData = async () => {
    try {
      const response = await fetch(
        `/api/admin/financial/revenue?range=${dateRange}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch revenue data');
      }

      const data = await response.json();
      setMetrics(data.metrics || null);
      setBreakdown(data.breakdown || null);
      setMonthlyData(data.monthlyData || []);
      setPlanDistribution(data.planDistribution || []);
    } catch (error) {
      console.error('Error fetching revenue:', error);
      toast.error('Failed to load revenue data');
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
    }).format(amount / 100);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Revenue Analytics
            </h1>
            <p className="text-gray-600 mt-1">
              Track revenue performance and growth metrics
            </p>
          </div>
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
        </div>

        {/* Key Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(metrics.totalRevenue)}
                    </p>
                    <div className="flex items-center mt-1">
                      {metrics.growthRate > 0 ? (
                        <>
                          <ArrowUp className="w-4 h-4 text-success-500 mr-1" />
                          <span className="text-sm text-success-500">
                            {formatPercentage(metrics.growthRate)}
                          </span>
                        </>
                      ) : (
                        <>
                          <ArrowDown className="w-4 h-4 text-error-500 mr-1" />
                          <span className="text-sm text-error-500">
                            {formatPercentage(Math.abs(metrics.growthRate))}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <DollarSign className="w-8 h-8 text-success-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">MRR</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(metrics.mrr)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Monthly Recurring
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
                    <p className="text-sm text-gray-600">ARR</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(metrics.arr)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Annual Recurring
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
                    <p className="text-sm text-gray-600">Avg Order</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(metrics.avgOrderValue)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Per transaction
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
                    <p className="text-sm text-gray-600">LTV</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(metrics.ltv)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Customer lifetime
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-indigo-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Customer & Conversion Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-xl font-bold">{metrics.totalUsers}</p>
                <p className="text-xs text-gray-400 mt-1">All signups</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">Paying Customers</p>
                <p className="text-xl font-bold text-green-600">{metrics.payingCustomers}</p>
                <p className="text-xs text-gray-400 mt-1">Have spent money</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">Subscribers</p>
                <p className="text-xl font-bold text-blue-600">{metrics.subscribers}</p>
                <p className="text-xs text-gray-400 mt-1">Active plans</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">Pay-Per-Use</p>
                <p className="text-xl font-bold text-orange-600">{metrics.payPerUseCustomers}</p>
                <p className="text-xs text-gray-400 mt-1">Credit purchases</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">Conversion Rate</p>
                <p className="text-xl font-bold">{formatPercentage(metrics.conversionRate)}</p>
                <p className="text-xs text-gray-400 mt-1">Users to paid</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">Churn Rate</p>
                <p className="text-xl font-bold">{formatPercentage(metrics.churnRate)}</p>
                <p className="text-xs text-gray-400 mt-1">Of paying customers</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Revenue Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {breakdown && (
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Subscriptions</span>
                    <span className="font-bold text-success-600">
                      {formatCurrency(breakdown.subscriptions)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      One-time Purchases
                    </span>
                    <span className="font-bold text-blue-600">
                      {formatCurrency(breakdown.oneTimePurchases)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Refunds</span>
                    <span className="font-bold text-error-600">
                      -{formatCurrency(breakdown.refunds)}
                    </span>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Net Revenue</span>
                      <span className="text-xl font-bold">
                        {formatCurrency(breakdown.net)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plan Distribution */}
          {planDistribution.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Plan Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={planDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={entry => `${entry.plan}: ${entry.percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="revenue"
                    >
                      {planDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {planDistribution.map((plan, index) => (
                    <div
                      key={plan.plan}
                      className="flex justify-between items-center"
                    >
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                        <span className="text-sm">{plan.plan}</span>
                      </div>
                      <span className="text-sm font-medium">
                        {plan.count} users
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Monthly Revenue Chart */}
        {monthlyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis
                    tickFormatter={value => `$${(value / 100).toFixed(0)}`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3B82F6"
                    name="Total Revenue"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="subscriptions"
                    stroke="#10B981"
                    name="Subscriptions"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="purchases"
                    stroke="#F59E0B"
                    name="Purchases"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Customer Growth Chart */}
        {monthlyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Customer Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="customers"
                    fill="#8B5CF6"
                    name="New Customers"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
