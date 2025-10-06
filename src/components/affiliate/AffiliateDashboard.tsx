'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  DollarSign,
  Users,
  MousePointer,
  TrendingUp,
  Copy,
  CheckCircle,
  ExternalLink,
  Calendar,
  Award,
  AlertCircle,
  FileText,
  Mail,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { maskEmail } from '@/lib/utils/privacy';
import type {
  Affiliate,
  AffiliateDashboardStats,
  Referral,
  Commission,
  Payout,
} from '@/types/affiliate';

interface AffiliateDashboardProps {
  initialData?: {
    affiliate: Affiliate;
    stats: AffiliateDashboardStats;
    recentReferrals: Referral[];
    recentCommissions: Commission[];
    payouts: Payout[];
    referralLink: string;
  };
}

export function AffiliateDashboard({ initialData }: AffiliateDashboardProps) {
  const [loading, setLoading] = useState(!initialData);
  const [data, setData] = useState(initialData);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialData) {
      fetchDashboardData();
    }
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/affiliate/dashboard');
      const result = await response.json();

      console.log('[AFFILIATE DASHBOARD v2] API Response:', result);
      console.log(
        '[AFFILIATE DASHBOARD v2] Recent Referrals:',
        result.recentReferrals
      );
      if (result.recentReferrals && result.recentReferrals.length > 0) {
        console.log(
          '[AFFILIATE DASHBOARD v2] First referral:',
          result.recentReferrals[0]
        );
        console.log(
          '[AFFILIATE DASHBOARD v2] First referral user:',
          result.recentReferrals[0].referred_user
        );
        console.log(
          '[AFFILIATE DASHBOARD v2] Email from API:',
          result.recentReferrals[0].referred_user?.email
        );
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load dashboard');
      }

      if (result.status === 'pending') {
        setError(
          'Your application is still under review. Please check back later.'
        );
        return;
      }

      if (result.status === 'rejected') {
        setError(result.message);
        return;
      }

      if (result.status === 'suspended') {
        setError(result.message);
        return;
      }

      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (data?.referralLink) {
      navigator.clipboard.writeText(data.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Account Status</h2>
        <p className="text-gray-600">{error}</p>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-600">No data available</p>
      </Card>
    );
  }

  const {
    affiliate,
    stats,
    recentReferrals,
    recentCommissions,
    payouts,
    referralLink,
  } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Affiliate Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {affiliate.display_name}!
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium
            ${
              affiliate.tier === 'gold'
                ? 'bg-yellow-100 text-yellow-800'
                : affiliate.tier === 'silver'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-blue-100 text-blue-800'
            }`}
          >
            {affiliate.tier.charAt(0).toUpperCase() + affiliate.tier.slice(1)}{' '}
            Tier
          </span>
          <Link href="/dashboard/affiliate/settings">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Referral Link */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h2 className="text-lg font-semibold mb-4">Your Referral Link</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 px-4 py-2 border rounded-lg bg-white"
          />
          <Button
            onClick={copyReferralLink}
            className="flex items-center gap-2"
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Link
              </>
            )}
          </Button>
        </div>
        <p className="text-sm text-gray-600 mt-3">
          Share this link to start earning{' '}
          {affiliate.commission_rate_recurring * 100}% recurring commissions!
        </p>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Clicks</p>
              <p className="text-2xl font-bold mt-1">{stats.total_clicks}</p>
            </div>
            <MousePointer className="w-8 h-8 text-blue-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600">Free Signups</p>
              <p className="text-2xl font-bold mt-1">{stats.total_signups}</p>
              {stats.total_clicks > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {((stats.total_signups / stats.total_clicks) * 100).toFixed(
                    1
                  )}
                  % conversion
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">No payment yet</p>
            </div>
            <Users className="w-8 h-8 text-green-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600">Paid Conversions</p>
              <p className="text-2xl font-bold mt-1">
                {stats.total_conversions}
              </p>
              {stats.total_signups > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {stats.conversion_rate.toFixed(1)}% of signups
                </p>
              )}
              <p className="text-xs text-green-600 mt-1 font-medium">
                💰 Earning commissions
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-2xl font-bold mt-1">
                ${stats.current_month_earnings.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ${stats.lifetime_earnings.toFixed(2)} lifetime
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-yellow-500 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Tax Form & Payout Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tax Form Status */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold mb-2 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Tax Information
              </h3>
              {affiliate.tax_form_completed ? (
                <div>
                  <p className="text-sm text-green-600 font-medium">
                    ✓ Tax form on file
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {affiliate.tax_form_type} submitted
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-yellow-600 font-medium mb-2">
                    Tax form required
                  </p>
                  <Link href="/affiliate/tax-forms">
                    <Button size="sm" variant="secondary">
                      Submit Tax Form
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Available Balance & Payout Request */}
        <Card className="p-6">
          <div className="flex-1">
            <h3 className="font-semibold mb-2 flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              Available Balance
            </h3>
            <p className="text-2xl font-bold mb-2">
              ${stats.available_balance?.toFixed(2) || '0.00'}
            </p>
            {affiliate.tax_form_completed ? (
              stats.available_balance >= 50 ? (
                <div>
                  <p className="text-xs text-gray-500 mb-2">
                    Minimum $50 for payout
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      const subject = encodeURIComponent(
                        'Affiliate Payout Request'
                      );
                      const body = encodeURIComponent(
                        `
Hi DTF Editor Team,

I would like to request a payout for my affiliate earnings.

Affiliate Code: ${affiliate.referral_code}
Available Balance: $${stats.available_balance?.toFixed(2)}
Payment Method: ${affiliate.payment_method || 'Please specify'}

Thank you!
                      `.trim()
                      );
                      window.location.href = `mailto:affiliates@dtfeditor.com?subject=${subject}&body=${body}`;
                    }}
                  >
                    <Mail className="w-4 h-4 mr-1" />
                    Request Payout
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  ${(50 - (stats.available_balance || 0)).toFixed(2)} more
                  needed for payout
                </p>
              )
            ) : (
              <p className="text-sm text-yellow-600">
                Submit tax form to enable payouts
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Tier Progress */}
      {stats.next_tier_progress && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">
              Progress to {stats.next_tier_progress.next_tier} Tier
            </h3>
            <span className="text-sm text-gray-600">
              ${stats.next_tier_progress.current_mrr.toFixed(2)} / $
              {stats.next_tier_progress.required_mrr} MRR
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full"
              style={{
                width: `${Math.min(stats.next_tier_progress.percentage, 100)}%`,
              }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Generate $
            {(
              stats.next_tier_progress.required_mrr -
              stats.next_tier_progress.current_mrr
            ).toFixed(2)}{' '}
            more in monthly recurring revenue to unlock{' '}
            {stats.next_tier_progress.next_tier === 'gold' ? '25%' : '22%'}{' '}
            commissions!
          </p>
        </Card>
      )}

      {/* Earnings Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Commissions */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Pending Commissions</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Awaiting Approval</span>
              <span className="font-semibold">
                ${stats.pending_commissions.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Paid Out</span>
              <span className="font-semibold text-green-600">
                ${stats.paid_commissions.toFixed(2)}
              </span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Lifetime Earnings</span>
                <span className="font-bold text-lg">
                  ${stats.lifetime_earnings.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Recent Referrals */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Recent Referrals</h3>
          {recentReferrals && recentReferrals.length > 0 ? (
            <div className="space-y-3">
              {recentReferrals.slice(0, 5).map((referral: any) => {
                const isPaid =
                  referral.status === 'converted' ||
                  (referral.referred_user?.subscription_status === 'active' &&
                    referral.referred_user?.subscription_plan !== 'free');
                const isFree =
                  referral.status === 'signed_up' &&
                  (!referral.referred_user?.subscription_status ||
                    referral.referred_user?.subscription_status === 'free');

                return (
                  <div
                    key={referral.id}
                    className="border rounded-lg p-3 bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full mt-1
                          ${
                            isPaid
                              ? 'bg-green-500'
                              : isFree
                                ? 'bg-gray-400'
                                : 'bg-yellow-500'
                          }`}
                        />
                        <div>
                          <p className="font-medium text-sm">
                            {maskEmail(referral.referred_user?.email)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(referral.created_at).toLocaleDateString(
                              'en-US',
                              {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium
                        ${
                          isPaid
                            ? 'bg-green-100 text-green-700'
                            : isFree
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {isPaid
                          ? '🟢 Paid Customer'
                          : isFree
                            ? '⚪ Free Signup'
                            : '🟡 Pending'}
                      </span>
                    </div>
                    {referral.referred_user?.subscription_plan && (
                      <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t">
                        <span className="text-gray-600">
                          Plan:{' '}
                          <span className="font-medium capitalize">
                            {referral.referred_user.subscription_plan}
                          </span>
                        </span>
                        {isPaid && (
                          <span className="text-green-600 font-medium">
                            💰 Earning commission
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No referrals yet. Share your link to get started!
            </p>
          )}
        </Card>
      </div>

      {/* Recent Commissions */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Recent Commissions</h3>
        {recentCommissions && recentCommissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentCommissions.map(commission => (
                  <tr key={commission.id} className="border-b">
                    <td className="py-2">
                      {new Date(commission.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2 capitalize">
                      {commission.transaction_type.replace('_', ' ')}
                    </td>
                    <td className="py-2 font-medium">
                      ${commission.commission_amount.toFixed(2)}
                    </td>
                    <td className="py-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full
                        ${
                          commission.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : commission.status === 'approved'
                              ? 'bg-blue-100 text-blue-700'
                              : commission.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {commission.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No commissions yet. They'll appear here after your referrals
            convert!
          </p>
        )}
      </Card>

      {/* Payout History */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Payout History</h3>
        {payouts && payouts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Period</th>
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Method</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map(payout => (
                  <tr key={payout.id} className="border-b">
                    <td className="py-2">
                      {new Date(payout.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2">
                      {new Date(payout.period_start).toLocaleDateString()} -
                      {new Date(payout.period_end).toLocaleDateString()}
                    </td>
                    <td className="py-2 font-medium">
                      ${payout.amount.toFixed(2)}
                    </td>
                    <td className="py-2 capitalize">{payout.payment_method}</td>
                    <td className="py-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full
                        ${
                          payout.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : payout.status === 'processing'
                              ? 'bg-blue-100 text-blue-700'
                              : payout.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {payout.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No payouts yet. Payouts are processed monthly when you reach the $50
            minimum threshold.
          </p>
        )}
      </Card>

      {/* Marketing Resources */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Marketing Resources</h3>
          <span className="text-xs font-medium px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
            Coming Soon
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          We're creating high-quality marketing materials to help you promote
          DTF Editor. Check back soon for banners, email templates, and social
          media kits!
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="justify-start" disabled>
            <ExternalLink className="w-4 h-4 mr-2" />
            Download Banners
          </Button>
          <Button variant="outline" className="justify-start" disabled>
            <ExternalLink className="w-4 h-4 mr-2" />
            Email Templates
          </Button>
          <Button variant="outline" className="justify-start" disabled>
            <ExternalLink className="w-4 h-4 mr-2" />
            Social Media Kit
          </Button>
        </div>
      </Card>
    </div>
  );
}
