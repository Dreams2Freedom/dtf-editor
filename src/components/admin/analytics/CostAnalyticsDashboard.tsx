'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DollarSign, TrendingUp, TrendingDown, Activity, Image } from 'lucide-react';
import { CostTrackingService } from '@/services/costTracking';
import { toast } from '@/lib/toast';

interface CostMetrics {
  totalCost: number;
  totalRevenue: number;
  totalRequests: number;
  grossProfit: number;
  profitMargin: number;
}

interface ProviderMetrics {
  [provider: string]: CostMetrics;
}

interface DailySummary {
  date: string;
  totalCost: number;
  totalRevenue: number;
  totalImages: number;
  profit: number;
}

export function CostAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [providerMetrics, setProviderMetrics] = useState<ProviderMetrics>({});
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [dateRange, setDateRange] = useState(30); // days
  const [refreshing, setRefreshing] = useState(false);

  const costTracking = new CostTrackingService();

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Get cost breakdown by provider
      const breakdown = await costTracking.getCostBreakdownByProvider(dateRange);
      setProviderMetrics(breakdown);

      // Get daily summaries
      const summaries = await costTracking.getApiUsageSummary(dateRange);
      
      // Group by date
      const dailyData = summaries.reduce((acc, summary) => {
        const date = summary.summary_date;
        if (!acc[date]) {
          acc[date] = {
            date,
            totalCost: 0,
            totalRevenue: 0,
            totalImages: 0,
            profit: 0
          };
        }
        
        acc[date].totalCost += parseFloat(summary.total_api_cost);
        acc[date].totalRevenue += parseFloat(summary.total_revenue);
        acc[date].totalImages += summary.successful_requests;
        acc[date].profit += parseFloat(summary.gross_profit);
        
        return acc;
      }, {} as Record<string, DailySummary>);

      setDailySummaries(Object.values(dailyData).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load cost analytics');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
    toast.success('Analytics refreshed');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const calculateTotals = () => {
    const totals = {
      cost: 0,
      revenue: 0,
      images: 0,
      profit: 0
    };

    Object.values(providerMetrics).forEach(metrics => {
      totals.cost += metrics.totalCost;
      totals.revenue += metrics.totalRevenue;
      totals.images += metrics.totalRequests;
      totals.profit += metrics.grossProfit;
    });

    return totals;
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const totals = calculateTotals();
  const overallProfitMargin = totals.revenue > 0 
    ? ((totals.profit / totals.revenue) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cost Analytics</h2>
          <p className="text-gray-600">API costs and profitability tracking</p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="rounded-md border-gray-300 shadow-sm focus:border-primary-blue focus:ring-primary-blue"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="px-4 py-2 bg-primary-blue text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total API Costs</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatCurrency(totals.cost)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {totals.images} images processed
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatCurrency(totals.revenue)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  From credits used
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Gross Profit</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatCurrency(totals.profit)}
                </p>
                <p className={`text-sm mt-1 ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totals.profit >= 0 ? '+' : ''}{formatPercentage(overallProfitMargin)} margin
                </p>
              </div>
              <div className={`p-3 rounded-full ${totals.profit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {totals.profit >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-green-600" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Cost per Image</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {totals.images > 0 ? formatCurrency(totals.cost / totals.images) : '$0.00'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Across all services
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Image className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown by Service</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(providerMetrics).map(([provider, metrics]) => {
              const profitMargin = metrics.totalRevenue > 0 
                ? ((metrics.grossProfit / metrics.totalRevenue) * 100)
                : 0;
              
              return (
                <div key={provider} className="border-b pb-4 last:border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900 capitalize">
                        {provider.replace('_', ' ')}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {metrics.totalRequests} images processed
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Cost: {formatCurrency(metrics.totalCost)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Revenue: {formatCurrency(metrics.totalRevenue)}
                      </p>
                      <p className={`text-sm font-medium ${metrics.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Profit: {formatCurrency(metrics.grossProfit)} ({formatPercentage(profitMargin)})
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Daily Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Images
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    API Cost
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Profit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Margin
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dailySummaries.slice(0, 10).map((summary) => {
                  const margin = summary.totalRevenue > 0 
                    ? ((summary.profit / summary.totalRevenue) * 100)
                    : 0;
                  
                  return (
                    <tr key={summary.date}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(summary.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {summary.totalImages}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(summary.totalCost)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(summary.totalRevenue)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                        summary.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(summary.profit)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                        margin >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(margin)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}