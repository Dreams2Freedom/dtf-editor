'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AffiliateAdminNav } from '@/components/admin/affiliates/AffiliateAdminNav';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import {
  DollarSign,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Download,
  Filter
} from 'lucide-react';

interface Commission {
  id: string;
  affiliate_id: string;
  referral_id: string;
  amount: string;
  commission_type: 'initial' | 'recurring';
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  payment_date?: string;
  stripe_payment_id?: string;
  created_at: string;
  affiliate?: {
    referral_code: string;
    user?: {
      email: string;
      full_name: string;
    };
  };
  referral?: {
    user_email: string;
    conversion_value: number;
  };
}

export default function AdminAffiliateCommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'paid' | 'cancelled'>('all');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [stats, setStats] = useState({
    totalCommissions: 0,
    pendingAmount: 0,
    paidAmount: 0,
    averageCommission: 0
  });

  useEffect(() => {
    fetchCommissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, selectedMonth]);

  async function fetchCommissions() {
    try {
      // Call API route instead of direct Supabase query
      const response = await fetch('/api/admin/affiliates/commissions');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch commissions');
      }

      const data = await response.json();
      let commissionsData = data.commissions || [];

      // Apply client-side filters
      if (filter !== 'all') {
        commissionsData = commissionsData.filter((c: any) => c.status === filter);
      }

      if (selectedMonth) {
        const startDate = new Date(selectedMonth + '-01');
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        commissionsData = commissionsData.filter((c: any) => {
          const createdAt = new Date(c.created_at);
          return createdAt >= startDate && createdAt <= endDate;
        });
      }

      setCommissions(commissionsData);

      // Calculate stats
      const total = commissionsData.length;
      const pending = commissionsData
        .filter((c: any) => c.status === 'pending' || c.status === 'approved')
        .reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0);
      const paid = commissionsData
        .filter((c: any) => c.status === 'paid')
        .reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0);
      const avg = total > 0 ? (pending + paid) / total : 0;

      setStats({
        totalCommissions: total,
        pendingAmount: pending,
        paidAmount: paid,
        averageCommission: avg
      });
    } catch (error) {
      console.error('Error fetching commissions:', error);
      toast.error('Failed to load commissions');
    } finally {
      setLoading(false);
    }
  }

  async function updateCommissionStatus(commissionId: string, newStatus: string) {
    try {
      const response = await fetch(`/api/admin/affiliates/commissions/${commissionId}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update commission');
      }

      toast.success(`Commission ${newStatus}`);
      await fetchCommissions();
    } catch (error) {
      console.error('Error updating commission:', error);
      toast.error('Failed to update commission');
    }
  }

  function exportCommissions() {
    const csv = [
      ['Date', 'Affiliate', 'Email', 'Amount', 'Type', 'Status', 'Referral Email'].join(','),
      ...commissions.map(c => [
        new Date(c.created_at).toLocaleDateString(),
        c.affiliate?.user?.full_name || '',
        c.affiliate?.user?.email || '',
        c.amount,
        c.commission_type,
        c.status,
        c.referral?.user_email || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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
          { label: 'Affiliates', href: '/admin/affiliates' },
          { label: 'Commissions' }
        ]}
      />

      <AffiliateAdminNav />

      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Commission History</h2>
        </div>
        <Button onClick={exportCommissions} variant="secondary">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Commissions</p>
                <p className="text-2xl font-bold">{stats.totalCommissions}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Payout</p>
                <p className="text-2xl font-bold">${stats.pendingAmount.toFixed(2)}</p>
              </div>
              <Clock className="h-8 w-8 text-warning-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Paid</p>
                <p className="text-2xl font-bold">${stats.paidAmount.toFixed(2)}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Commission</p>
                <p className="text-2xl font-bold">${stats.averageCommission.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Filter:</span>
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-1 border rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1 border rounded-lg text-sm"
              placeholder="Select month"
            />
            {(filter !== 'all' || selectedMonth) && (
              <button
                onClick={() => {
                  setFilter('all');
                  setSelectedMonth('');
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear filters
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Commissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Commission History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Affiliate</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Referral</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {commissions.map((commission) => (
                  <tr key={commission.id}>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(commission.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {commission.affiliate?.user?.full_name || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {commission.affiliate?.referral_code}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">
                        {commission.referral?.user_email || 'N/A'}
                      </div>
                      {commission.referral?.conversion_value && (
                        <div className="text-xs text-gray-500">
                          Value: ${commission.referral.conversion_value}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      ${parseFloat(commission.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        commission.commission_type === 'recurring'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {commission.commission_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        commission.status === 'paid' ? 'bg-success-100 text-success-800' :
                        commission.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        commission.status === 'cancelled' ? 'bg-error-100 text-error-800' :
                        'bg-warning-100 text-warning-800'
                      }`}>
                        {commission.status === 'paid' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {commission.status === 'cancelled' && <XCircle className="h-3 w-3 mr-1" />}
                        {commission.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                        {commission.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {commission.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateCommissionStatus(commission.id, 'approved')}
                              className="text-success-600 hover:text-success-800 text-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => updateCommissionStatus(commission.id, 'cancelled')}
                              className="text-error-600 hover:text-error-800 text-sm"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {commission.status === 'approved' && (
                          <button
                            onClick={() => updateCommissionStatus(commission.id, 'paid')}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}