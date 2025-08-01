'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  CreditCard,
  UserMinus,
  UserPlus,
  BarChart3,
  Activity,
  ArrowUp,
  ArrowDown,
  Info
} from 'lucide-react';
import { toast } from '@/lib/toast';

interface KPIData {
  conversion: {
    rate: number;
    trend: number;
    freeToBasic: number;
    freeToStarter: number;
    trialConversion: number;
  };
  churn: {
    rate: number;
    trend: number;
    monthlyChurn: number;
    yearlyChurn: number;
    byPlan: {
      basic: number;
      starter: number;
    };
  };
  financial: {
    arpu: number; // Average Revenue Per User
    arpuTrend: number;
    ltv: number; // Lifetime Value
    cac: number; // Customer Acquisition Cost
    ltvCacRatio: number;
    paybackPeriod: number; // in months
  };
  growth: {
    userGrowthRate: number;
    mauGrowth: number; // Monthly Active Users growth
    newUsersThisMonth: number;
    referralRate: number;
  };
  retention: {
    day1: number;
    day7: number;
    day30: number;
    day90: number;
  };
}

export function KPIDashboard() {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    fetchKPIData();
  }, [timeRange]);

  const fetchKPIData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics/kpi?range=${timeRange}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch KPI data');
      }

      const data = await response.json();
      setKpiData(data);
    } catch (error) {
      console.error('Error fetching KPI data:', error);
      toast.error('Failed to load KPI data');
    } finally {
      setLoading(false);
    }
  };

  const formatPercentage = (value: number) => `${(value || 0).toFixed(1)}%`;
  const formatCurrency = (value: number) => `$${(value || 0).toFixed(2)}`;
  const formatNumber = (value: number) => value.toLocaleString();

  const getTrendIcon = (trend: number) => {
    return trend > 0 ? (
      <ArrowUp className="w-4 h-4 text-green-600" />
    ) : (
      <ArrowDown className="w-4 h-4 text-red-600" />
    );
  };

  const getTrendColor = (trend: number, inverse = false) => {
    if (inverse) {
      return trend > 0 ? 'text-red-600' : 'text-green-600';
    }
    return trend > 0 ? 'text-green-600' : 'text-red-600';
  };

  if (loading || !kpiData) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Key Performance Indicators</h2>
        <div className="flex gap-2">
          {(['30d', '90d', '1y'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Conversion Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="text-base font-medium">Conversion Rate</span>
              <UserPlus className="w-5 h-5 text-gray-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-3xl font-bold">{formatPercentage(kpiData.conversion.rate)}</p>
                <p className={`text-sm flex items-center gap-1 mt-1 ${getTrendColor(kpiData.conversion.trend)}`}>
                  {getTrendIcon(kpiData.conversion.trend)}
                  {Math.abs(kpiData.conversion.trend)}% vs last period
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Free → Basic</span>
                  <span className="font-medium">{formatPercentage(kpiData.conversion.freeToBasic)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Free → Starter</span>
                  <span className="font-medium">{formatPercentage(kpiData.conversion.freeToStarter)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Churn Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="text-base font-medium">Churn Rate</span>
              <UserMinus className="w-5 h-5 text-gray-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-3xl font-bold">{formatPercentage(kpiData.churn.rate)}</p>
                <p className={`text-sm flex items-center gap-1 mt-1 ${getTrendColor(kpiData.churn.trend, true)}`}>
                  {getTrendIcon(kpiData.churn.trend)}
                  {Math.abs(kpiData.churn.trend)}% vs last period
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly</span>
                  <span className="font-medium">{formatPercentage(kpiData.churn.monthlyChurn)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Basic Plan</span>
                  <span className="font-medium">{formatPercentage(kpiData.churn.byPlan.basic)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Starter Plan</span>
                  <span className="font-medium">{formatPercentage(kpiData.churn.byPlan.starter)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ARPU */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="text-base font-medium">ARPU</span>
              <DollarSign className="w-5 h-5 text-gray-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-3xl font-bold">{formatCurrency(kpiData.financial.arpu)}</p>
                <p className={`text-sm flex items-center gap-1 mt-1 ${getTrendColor(kpiData.financial.arpuTrend)}`}>
                  {getTrendIcon(kpiData.financial.arpuTrend)}
                  {Math.abs(kpiData.financial.arpuTrend)}% vs last period
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">LTV</span>
                  <span className="font-medium">{formatCurrency(kpiData.financial.ltv)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">CAC</span>
                  <span className="font-medium">{formatCurrency(kpiData.financial.cac)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">LTV:CAC</span>
                  <span className="font-medium">{kpiData.financial.ltvCacRatio ? kpiData.financial.ltvCacRatio.toFixed(1) : '0.0'}:1</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Growth */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="text-base font-medium">User Growth</span>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-3xl font-bold">{formatPercentage(kpiData.growth.userGrowthRate)}</p>
                <p className="text-sm text-gray-600 mt-1">Month over month</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">New Users</span>
                  <span className="font-medium">{formatNumber(kpiData.growth.newUsersThisMonth)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">MAU Growth</span>
                  <span className="font-medium">{formatPercentage(kpiData.growth.mauGrowth)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Referral Rate</span>
                  <span className="font-medium">{formatPercentage(kpiData.growth.referralRate)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Retention Cohorts */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="text-base font-medium">Retention Cohorts</span>
              <Activity className="w-5 h-5 text-gray-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{formatPercentage(kpiData.retention.day1)}</p>
                  <p className="text-sm text-gray-600 mt-1">Day 1</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{formatPercentage(kpiData.retention.day7)}</p>
                  <p className="text-sm text-gray-600 mt-1">Day 7</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{formatPercentage(kpiData.retention.day30)}</p>
                  <p className="text-sm text-gray-600 mt-1">Day 30</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{formatPercentage(kpiData.retention.day90)}</p>
                  <p className="text-sm text-gray-600 mt-1">Day 90</p>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                  <p className="text-sm text-blue-700">
                    Retention rates show the percentage of users who return after their first visit
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Business Health Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-lg bg-gray-50">
              <p className="text-sm text-gray-600 mb-2">Payback Period</p>
              <p className="text-2xl font-bold">{kpiData.financial.paybackPeriod ? kpiData.financial.paybackPeriod.toFixed(1) : '0.0'}</p>
              <p className="text-sm text-gray-600">months</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gray-50">
              <p className="text-sm text-gray-600 mb-2">LTV:CAC Ratio</p>
              <p className={`text-2xl font-bold ${
                kpiData.financial.ltvCacRatio >= 3 ? 'text-green-600' : 
                kpiData.financial.ltvCacRatio >= 1 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {kpiData.financial.ltvCacRatio ? kpiData.financial.ltvCacRatio.toFixed(1) : '0.0'}:1
              </p>
              <p className="text-sm text-gray-600">
                {kpiData.financial.ltvCacRatio >= 3 ? 'Healthy' : 
                 kpiData.financial.ltvCacRatio >= 1 ? 'Needs Improvement' : 'Critical'}
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gray-50">
              <p className="text-sm text-gray-600 mb-2">Monthly Churn</p>
              <p className={`text-2xl font-bold ${
                kpiData.churn.monthlyChurn <= 5 ? 'text-green-600' : 
                kpiData.churn.monthlyChurn <= 10 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {formatPercentage(kpiData.churn.monthlyChurn)}
              </p>
              <p className="text-sm text-gray-600">
                {kpiData.churn.monthlyChurn <= 5 ? 'Excellent' : 
                 kpiData.churn.monthlyChurn <= 10 ? 'Average' : 'High'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}