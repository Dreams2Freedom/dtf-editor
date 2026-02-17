'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  Search,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Package,
  Calendar,
  Download,
  RefreshCw,
} from 'lucide-react';
import { toast } from '@/lib/toast';

interface Transaction {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  type: 'purchase' | 'subscription' | 'usage' | 'refund';
  amount: number;
  credits?: number;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  stripe_payment_id?: string;
  description: string;
  created_at: string;
}

interface TransactionMetrics {
  total_revenue: number;
  total_transactions: number;
  successful_transactions: number;
  failed_transactions: number;
  refunded_amount: number;
  average_transaction: number;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [metrics, setMetrics] = useState<TransactionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30d');
  const [syncing, setSyncing] = useState(false);

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/admin/financial/transactions?range=${dateRange}`,
        { credentials: 'include' }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
      setMetrics(data.metrics || null);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const filterTransactions = useCallback(() => {
    let filtered = transactions;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        t =>
          t.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.stripe_payment_id?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    setFilteredTransactions(filtered);
  }, [transactions, searchQuery, typeFilter, statusFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    filterTransactions();
  }, [filterTransactions]);

  const getTypeVariant = (
    type: string
  ): 'success' | 'info' | 'default' | 'error' | 'secondary' => {
    const variants = {
      purchase: 'success' as const,
      subscription: 'info' as const,
      usage: 'default' as const,
      refund: 'error' as const,
    };
    return variants[type as keyof typeof variants] || 'secondary';
  };

  const getStatusVariant = (
    status: string
  ): 'success' | 'warning' | 'error' | 'secondary' => {
    const variants = {
      completed: 'success' as const,
      pending: 'warning' as const,
      failed: 'error' as const,
      refunded: 'warning' as const,
    };
    return variants[status as keyof typeof variants] || 'secondary';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const exportTransactions = () => {
    const csv = [
      ['Date', 'User', 'Email', 'Type', 'Amount', 'Status', 'Description'].join(
        ','
      ),
      ...filteredTransactions.map(t =>
        [
          new Date(t.created_at).toLocaleDateString(),
          t.user_name,
          t.user_email,
          t.type,
          formatCurrency(t.amount),
          t.status,
          t.description,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const syncStripePayments = async () => {
    setSyncing(true);
    try {
      // First, dry run to preview
      const previewRes = await fetch('/api/admin/financial/backfill-stripe', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true }),
      });

      if (!previewRes.ok) {
        const err = await previewRes.json();
        throw new Error(err.error || 'Failed to preview');
      }

      const preview = await previewRes.json();
      const count = preview.summary.wouldInsert || 0;

      if (count === 0) {
        toast.info(
          `No new Stripe payments to import. ${preview.summary.totalStripeCheckouts} checkout sessions found, ${preview.summary.skippedDuplicate} already recorded.`
        );
        setSyncing(false);
        return;
      }

      // Confirm with user
      const confirmed = window.confirm(
        `Found ${count} Stripe payments to import.\n\n` +
          `Total checkouts in Stripe: ${preview.summary.totalStripeCheckouts}\n` +
          `Already recorded: ${preview.summary.skippedDuplicate}\n` +
          `No matching user: ${preview.summary.skippedNoUser}\n\n` +
          `Proceed with importing ${count} payment records?`
      );

      if (!confirmed) {
        setSyncing(false);
        return;
      }

      // Commit
      const commitRes = await fetch('/api/admin/financial/backfill-stripe', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false }),
      });

      if (!commitRes.ok) {
        const err = await commitRes.json();
        throw new Error(err.error || 'Failed to import');
      }

      const result = await commitRes.json();
      toast.success(
        `Imported ${result.summary.inserted} Stripe payments successfully!`
      );

      // Refresh the transactions list
      fetchTransactions();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to sync Stripe payments'
      );
    } finally {
      setSyncing(false);
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
            <p className="text-gray-600 mt-1">
              View and manage all financial transactions
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={syncStripePayments}
              variant="outline"
              disabled={syncing}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`}
              />
              {syncing ? 'Syncing...' : 'Sync Stripe Payments'}
            </Button>
            <Button onClick={exportTransactions} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(metrics.total_revenue)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-success-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Transactions</p>
                    <p className="text-xl font-bold">
                      {metrics.total_transactions}
                    </p>
                  </div>
                  <CreditCard className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Successful</p>
                    <p className="text-xl font-bold">
                      {metrics.successful_transactions}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-success-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Failed</p>
                    <p className="text-xl font-bold">
                      {metrics.failed_transactions}
                    </p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-error-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Refunded</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(metrics.refunded_amount)}
                    </p>
                  </div>
                  <Package className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Value</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(metrics.average_transaction)}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="purchase">Purchase</option>
            <option value="subscription">Subscription</option>
            <option value="usage">Usage</option>
            <option value="refund">Refund</option>
          </select>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>

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

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">User</th>
                    <th className="text-left py-3 px-4">Type</th>
                    <th className="text-left py-3 px-4">Description</th>
                    <th className="text-right py-3 px-4">Amount</th>
                    <th className="text-center py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-8 text-gray-500"
                      >
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map(transaction => (
                      <tr
                        key={transaction.id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 text-sm">
                          {new Date(
                            transaction.created_at
                          ).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">
                              {transaction.user_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {transaction.user_email}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={getTypeVariant(transaction.type)}>
                            {transaction.type}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {transaction.description}
                          {transaction.credits && (
                            <span className="ml-2 text-gray-500">
                              ({transaction.credits} credits)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          {transaction.type === 'refund' && '-'}
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={getStatusVariant(transaction.status)}>
                            {transaction.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
