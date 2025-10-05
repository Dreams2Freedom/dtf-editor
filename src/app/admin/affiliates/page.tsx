'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AffiliateAdminNav } from '@/components/admin/affiliates/AffiliateAdminNav';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import {
  UsersRound,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Trophy
} from 'lucide-react';

interface AffiliateStats {
  totalAffiliates: number;
  activeAffiliates: number;
  pendingApplications: number;
  totalReferrals: number;
  totalCommissionsEarned: number;
  pendingPayouts: number;
  topPerformers: {
    id: string;
    name: string;
    email: string;
    totalEarnings: number;
    referrals: number;
  }[];
  recentActivity: {
    type: 'application' | 'referral' | 'commission' | 'payout';
    description: string;
    timestamp: string;
  }[];
}

export default function AdminAffiliatesPage() {
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchAffiliateStats();
     
  }, []);

  async function fetchAffiliateStats() {
    try {
      // Call API route instead of direct Supabase query
      // API route uses service role client to bypass RLS
      const response = await fetch('/api/admin/affiliates/stats');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch affiliate stats');
      }

      const data = await response.json();
      const {
        affiliates,
        referrals,
        commissions,
        totalAffiliates,
        activeAffiliates,
        pendingApplications,
        totalReferrals,
        totalCommissionsEarned,
        pendingPayouts
      } = data;

      // Get top performers
      const affiliateEarnings = new Map();
      const affiliateReferrals = new Map();

      commissions?.forEach(c => {
        const current = affiliateEarnings.get(c.affiliate_id) || 0;
        affiliateEarnings.set(c.affiliate_id, current + parseFloat(c.amount || 0));
      });

      referrals?.forEach(r => {
        const current = affiliateReferrals.get(r.affiliate_id) || 0;
        affiliateReferrals.set(r.affiliate_id, current + 1);
      });

      // Fetch user profiles for top performers
      const topPerformerIds = Array.from(affiliateEarnings.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([affiliateId]) => affiliateId);

      const topPerformerAffiliates = affiliates?.filter(a =>
        topPerformerIds.includes(a.id)
      ) || [];

      const userIds = topPerformerAffiliates.map(a => a.user_id);

      // Fetch profiles for top performers via API
      const profilesResponse = await fetch('/api/admin/users/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds })
      });

      const profilesData = await profilesResponse.json();
      const profilesMap = new Map(
        profilesData.profiles?.map((p: any) => [p.id, p]) || []
      );

      const topPerformers = topPerformerIds.map(affiliateId => {
        const affiliate = affiliates?.find(a => a.id === affiliateId);
        const profile = profilesMap.get(affiliate?.user_id);
        const earnings = affiliateEarnings.get(affiliateId) || 0;

        return {
          id: affiliateId,
          name: profile?.full_name || 'Unknown',
          email: profile?.email || '',
          totalEarnings: earnings,
          referrals: affiliateReferrals.get(affiliateId) || 0
        };
      });

      // Get recent activity
      const recentActivity: any[] = [];

      // Add recent applications
      affiliates?.slice(0, 5).forEach(a => {
        recentActivity.push({
          type: 'application',
          description: `New affiliate application from ${a.referral_code}`,
          timestamp: a.created_at
        });
      });

      // Add recent referrals
      referrals?.slice(0, 5).forEach(r => {
        recentActivity.push({
          type: 'referral',
          description: `New referral tracked`,
          timestamp: r.created_at
        });
      });

      // Sort by timestamp
      recentActivity.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ).slice(0, 10);

      setStats({
        totalAffiliates,
        activeAffiliates,
        pendingApplications,
        totalReferrals,
        totalCommissionsEarned,
        pendingPayouts,
        topPerformers,
        recentActivity
      });
    } catch (error) {
      console.error('Error fetching affiliate stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <Breadcrumb
        homeHref="/admin"
        homeLabel="Admin Dashboard"
        items={[
          { label: 'Affiliates' }
        ]}
      />

      <AffiliateAdminNav />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Affiliates</p>
                <p className="text-2xl font-bold">{stats?.totalAffiliates || 0}</p>
              </div>
              <UsersRound className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Affiliates</p>
                <p className="text-2xl font-bold">{stats?.activeAffiliates || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Applications</p>
                <p className="text-2xl font-bold">{stats?.pendingApplications || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-warning-600" />
            </div>
            {stats?.pendingApplications > 0 && (
              <button
                onClick={() => router.push('/admin/affiliates/applications')}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Review Applications →
              </button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Referrals</p>
                <p className="text-2xl font-bold">{stats?.totalReferrals || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Commissions Earned</p>
                <p className="text-3xl font-bold">${(stats?.totalCommissionsEarned || 0).toFixed(2)}</p>
              </div>
              <DollarSign className="h-10 w-10 text-success-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Payouts</p>
                <p className="text-3xl font-bold">${(stats?.pendingPayouts || 0).toFixed(2)}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-orange-600" />
            </div>
            {stats?.pendingPayouts > 0 && (
              <button
                onClick={() => router.push('/admin/affiliates/payouts')}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Process Payouts →
              </button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="h-5 w-5 mr-2 text-warning-500" />
            Top Performers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Affiliate</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Earnings</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Referrals</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg. Per Referral</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats?.topPerformers.map((performer, index) => (
                  <tr key={performer.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        {index === 0 && <span className="mr-2">🥇</span>}
                        {index === 1 && <span className="mr-2">🥈</span>}
                        {index === 2 && <span className="mr-2">🥉</span>}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{performer.name}</div>
                          <div className="text-xs text-gray-500">{performer.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      ${performer.totalEarnings.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {performer.referrals}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      ${performer.referrals > 0 ? (performer.totalEarnings / performer.referrals).toFixed(2) : '0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats?.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center">
                  {activity.type === 'application' && <UsersRound className="h-4 w-4 mr-2 text-blue-600" />}
                  {activity.type === 'referral' && <ArrowUpRight className="h-4 w-4 mr-2 text-success-600" />}
                  {activity.type === 'commission' && <DollarSign className="h-4 w-4 mr-2 text-purple-600" />}
                  {activity.type === 'payout' && <ArrowDownRight className="h-4 w-4 mr-2 text-orange-600" />}
                  <span className="text-sm">{activity.description}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(activity.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}