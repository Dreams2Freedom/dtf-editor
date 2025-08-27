'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Image,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from '@/lib/toast';

interface CostAnalytics {
  summary: {
    totalRequests: number;
    totalCost: number;
    totalRevenue: number;
    totalProfit: number;
    profitMargin: number;
    avgCostPerRequest: number;
    avgRevenuePerRequest: number;
  };
  byProvider: {
    [key: string]: {
      requests: number;
      successfulRequests: number;
      failedRequests: number;
      totalCost: number;
      totalRevenue: number;
      totalProfit: number;
      operations: {
        [key: string]: {
          count: number;
          cost: number;
          revenue: number;
        };
      };
    };
  };
  recentLogs: any[];
}

export function CostAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<CostAnalytics | null>(null);
  const [dailySummaries, setDailySummaries] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/admin/analytics/costs?days=${dateRange}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch analytics');
      }
      
      setAnalytics(data.analytics);
      setDailySummaries(data.dailySummaries || []);
      
    } catch (error) {
      console.error('Error loading cost analytics:', error);
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

  const getProviderName = (provider: string) => {
    const names: Record<string, string> = {
      deep_image: 'Deep-Image.ai',
      clipping_magic: 'ClippingMagic',
      vectorizer: 'Vectorizer.ai',
      openai: 'OpenAI (DALL-E)',
      stripe: 'Stripe Payments'
    };
    return names[provider] || provider;
  };

  const getOperationName = (operation: string) => {
    const names: Record<string, string> = {
      upscale: 'Image Upscaling',
      background_removal: 'Background Removal',
      vectorization: 'Vectorization',
      image_generation: 'AI Generation',
      payment_processing: 'Payment Processing'
    };
    return names[operation] || operation;
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Analytics Data</h3>
        <p className="text-gray-600 mb-4">
          Start processing images to see cost analytics
        </p>
        <button
          onClick={refreshData}
          className="px-4 py-2 bg-primary-blue text-white rounded-md hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>
    );
  }

  const { summary } = analytics;
  const profitMarginClass = summary.profitMargin > 30 ? 'text-green-600' : 
                           summary.profitMargin > 10 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">API Cost Analytics</h2>
          <p className="text-gray-600">Track API costs and profitability in real-time</p>
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
            className="px-4 py-2 bg-primary-blue text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
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
                  {formatCurrency(summary.totalCost)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {summary.totalRequests} requests
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
                  {formatCurrency(summary.totalRevenue)}
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
                  {formatCurrency(summary.totalProfit)}
                </p>
                <p className={`text-sm mt-1 ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.totalProfit >= 0 ? '+' : ''}{formatPercentage(summary.profitMargin)} margin
                </p>
              </div>
              <div className={`p-3 ${summary.totalProfit >= 0 ? 'bg-green-100' : 'bg-red-100'} rounded-full`}>
                {summary.totalProfit >= 0 ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Profit Margin</p>
                <p className={`text-2xl font-bold mt-2 ${profitMarginClass}`}>
                  {formatPercentage(summary.profitMargin)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Avg ${summary.avgRevenuePerRequest.toFixed(2)}/request
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown by Provider</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Provider</th>
                  <th className="text-right py-2">Requests</th>
                  <th className="text-right py-2">Success Rate</th>
                  <th className="text-right py-2">Total Cost</th>
                  <th className="text-right py-2">Total Revenue</th>
                  <th className="text-right py-2">Profit</th>
                  <th className="text-right py-2">Margin</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(analytics.byProvider).map(([provider, data]) => {
                  const successRate = data.requests > 0 
                    ? (data.successfulRequests / data.requests) * 100 
                    : 0;
                  const margin = data.totalRevenue > 0 
                    ? (data.totalProfit / data.totalRevenue) * 100 
                    : 0;
                  
                  return (
                    <tr key={provider} className="border-b hover:bg-gray-50">
                      <td className="py-3 font-medium">{getProviderName(provider)}</td>
                      <td className="text-right py-3">{data.requests}</td>
                      <td className="text-right py-3">
                        <span className={successRate > 95 ? 'text-green-600' : successRate > 90 ? 'text-yellow-600' : 'text-red-600'}>
                          {formatPercentage(successRate)}
                        </span>
                      </td>
                      <td className="text-right py-3">{formatCurrency(data.totalCost)}</td>
                      <td className="text-right py-3">{formatCurrency(data.totalRevenue)}</td>
                      <td className={`text-right py-3 ${data.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(data.totalProfit)}
                      </td>
                      <td className={`text-right py-3 ${margin > 30 ? 'text-green-600' : margin > 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {formatPercentage(margin)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td className="py-3">Total</td>
                  <td className="text-right py-3">{summary.totalRequests}</td>
                  <td className="text-right py-3">-</td>
                  <td className="text-right py-3">{formatCurrency(summary.totalCost)}</td>
                  <td className="text-right py-3">{formatCurrency(summary.totalRevenue)}</td>
                  <td className={`text-right py-3 ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(summary.totalProfit)}
                  </td>
                  <td className={`text-right py-3 ${profitMarginClass}`}>
                    {formatPercentage(summary.profitMargin)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Operation Details */}
      <Card>
        <CardHeader>
          <CardTitle>Operations Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(analytics.byProvider).map(([provider, data]) => (
              Object.entries(data.operations).map(([operation, opData]) => {
                const profit = opData.revenue - opData.cost;
                const margin = opData.revenue > 0 ? (profit / opData.revenue) * 100 : 0;
                
                return (
                  <div key={`${provider}-${operation}`} className="p-4 border rounded-lg">
                    <h4 className="font-medium text-sm text-gray-700 mb-2">
                      {getOperationName(operation)}
                    </h4>
                    <p className="text-xs text-gray-500 mb-3">{getProviderName(provider)}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Count:</span>
                        <span className="font-medium">{opData.count}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Cost:</span>
                        <span className="font-medium">{formatCurrency(opData.cost)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Revenue:</span>
                        <span className="font-medium">{formatCurrency(opData.revenue)}</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t">
                        <span className="text-gray-600">Profit:</span>
                        <span className={`font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(profit)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Margin:</span>
                        <span className={`font-medium ${margin > 30 ? 'text-green-600' : margin > 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {formatPercentage(margin)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cost Alerts */}
      {summary.profitMargin < 20 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-800">Low Profit Margin Warning</h3>
                <p className="text-yellow-700 mt-1">
                  Your current profit margin of {formatPercentage(summary.profitMargin)} is below the recommended 20%.
                  Consider adjusting credit pricing or negotiating better API rates.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}