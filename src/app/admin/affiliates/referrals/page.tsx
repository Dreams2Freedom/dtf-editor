'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import {
  Users,
  TrendingUp,
  DollarSign,
  Filter,
  Download,
  Search,
  ExternalLink,
  Calendar,
  CreditCard
} from 'lucide-react';

interface ReferralData {
  id: string;
  affiliate_id: string;
  referred_user_id: string;
  referral_code: string;
  status: string;
  signed_up_at: string;
  first_payment_at: string | null;
  conversion_value: number | null;
  created_at: string;
  utm_source?: string;
  utm_campaign?: string;
  affiliate: {
    id: string;
    user_id: string;
    display_name: string;
    referral_code: string;
    affiliate_user: {
      email: string;
      first_name: string;
      last_name: string;
    };
  };
  referred_user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    subscription_plan: string;
    subscription_status: string;
    total_credits_purchased: number;
    total_credits_used: number;
    created_at: string;
  };
}

interface Stats {
  total_referrals: number;
  free_accounts: number;
  basic_accounts: number;
  starter_accounts: number;
  professional_accounts: number;
  total_conversions: number;
  total_conversion_value: number;
  conversion_rate: string;
}

export default function AffiliateReferralsPage() {
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [planFilter, setPlanFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchReferrals();
  }, [planFilter, timeFilter, sortBy, sortOrder]);

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        plan: planFilter,
        time: timeFilter,
        sort: sortBy,
        order: sortOrder
      });

      const response = await fetch(`/api/admin/affiliates/referrals?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch referrals');
      }

      const data = await response.json();
      setReferrals(data.referrals || []);
      setStats(data.stats || null);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredReferrals = referrals.filter(referral => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    const affiliateName = `${referral.affiliate?.affiliate_user?.first_name || ''} ${referral.affiliate?.affiliate_user?.last_name || ''}`.toLowerCase();
    const affiliateEmail = referral.affiliate?.affiliate_user?.email?.toLowerCase() || '';
    const userName = `${referral.referred_user?.first_name || ''} ${referral.referred_user?.last_name || ''}`.toLowerCase();
    const userEmail = referral.referred_user?.email?.toLowerCase() || '';

    return affiliateName.includes(query) ||
           affiliateEmail.includes(query) ||
           userName.includes(query) ||
           userEmail.includes(query) ||
           referral.referral_code?.toLowerCase().includes(query);
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free':
        return 'bg-gray-100 text-gray-700';
      case 'basic':
        return 'bg-blue-100 text-blue-700';
      case 'starter':
        return 'bg-purple-100 text-purple-700';
      case 'professional':
        return 'bg-success-100 text-success-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Referral Date',
      'Affiliate Name',
      'Affiliate Email',
      'Referral Code',
      'User Name',
      'User Email',
      'Current Plan',
      'Status',
      'Sign Up Date',
      'First Payment',
      'Conversion Value',
      'Credits Purchased',
      'Credits Used'
    ];

    const rows = filteredReferrals.map(r => [
      formatDate(r.created_at),
      `${r.affiliate?.affiliate_user?.first_name || ''} ${r.affiliate?.affiliate_user?.last_name || ''}`,
      r.affiliate?.affiliate_user?.email || '',
      r.referral_code || '',
      `${r.referred_user?.first_name || ''} ${r.referred_user?.last_name || ''}`,
      r.referred_user?.email || '',
      r.referred_user?.subscription_plan || 'free',
      r.status || '',
      formatDate(r.signed_up_at),
      r.first_payment_at ? formatDate(r.first_payment_at) : 'Not yet',
      r.conversion_value || '0',
      r.referred_user?.total_credits_purchased || '0',
      r.referred_user?.total_credits_used || '0'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `affiliate-referrals-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Breadcrumb */}
      <Breadcrumb
        homeHref="/admin"
        homeLabel="Admin Dashboard"
        items={[
          { label: 'Affiliates', href: '/admin/affiliates' },
          { label: 'Referrals' }
        ]}
      />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Affiliate Referrals</h1>
        <p className="text-gray-600">Track all accounts referred by affiliates</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Referrals</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_referrals}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Paid Conversions</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_conversions}</p>
                <p className="text-xs text-gray-500 mt-1">{stats.conversion_rate}% conversion rate</p>
              </div>
              <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Value</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {formatCurrency(stats.total_conversion_value)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Plan Distribution</p>
                <div className="mt-2 space-y-1">
                  <p className="text-sm"><span className="font-medium">{stats.free_accounts}</span> Free</p>
                  <p className="text-sm"><span className="font-medium">{stats.basic_accounts}</span> Basic</p>
                  <p className="text-sm"><span className="font-medium">{stats.starter_accounts}</span> Starter</p>
                  <p className="text-sm"><span className="font-medium">{stats.professional_accounts}</span> Pro</p>
                </div>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, email, code..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Plan Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subscription Plan
            </label>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Plans</option>
              <option value="free">Free</option>
              <option value="basic">Basic</option>
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
            </select>
          </div>

          {/* Time Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Period
            </label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="quarter">Last Quarter (90 days)</option>
              <option value="year">Last Year</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="created_at">Date</option>
                <option value="conversion_value">Value</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPlanFilter('all');
              setTimeFilter('all');
              setSearchQuery('');
              setSortBy('created_at');
              setSortOrder('desc');
            }}
          >
            Reset Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={filteredReferrals.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </Card>

      {/* Referrals Table */}
      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading referrals...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-error-600">{error}</p>
              <Button onClick={fetchReferrals} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : filteredReferrals.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No referrals found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referred Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Affiliate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referred User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReferrals.map((referral) => (
                  <tr key={referral.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        {formatDate(referral.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">
                          {referral.affiliate?.affiliate_user?.first_name} {referral.affiliate?.affiliate_user?.last_name}
                        </p>
                        <p className="text-gray-500">{referral.affiliate?.affiliate_user?.email}</p>
                        <p className="text-xs text-gray-400 mt-1">Code: {referral.referral_code}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">
                          {referral.referred_user?.first_name} {referral.referred_user?.last_name}
                        </p>
                        <p className="text-gray-500">{referral.referred_user?.email}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Joined: {formatDate(referral.referred_user?.created_at)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${getPlanBadgeColor(referral.referred_user?.subscription_plan || 'free')}`}>
                        {(referral.referred_user?.subscription_plan || 'free').charAt(0).toUpperCase() + (referral.referred_user?.subscription_plan || 'free').slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <p className="text-gray-900">
                          {referral.first_payment_at ? '✓ Converted' : 'Free User'}
                        </p>
                        {referral.first_payment_at && (
                          <p className="text-xs text-gray-500">{formatDate(referral.first_payment_at)}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(referral.conversion_value)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {referral.referred_user?.total_credits_purchased || 0} credits
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <a
                        href={`/admin/users?id=${referral.referred_user_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 inline-flex items-center"
                      >
                        View User
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
