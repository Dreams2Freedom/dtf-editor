'use client';

import { useState, useEffect } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase/client';
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
  Send,
  CreditCard,
  FileText,
  Download,
  AlertTriangle,
} from 'lucide-react';

interface Payout {
  id: string;
  affiliate_id: string;
  amount: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payment_method: 'paypal' | 'check';
  payment_details?: any;
  transaction_id?: string;
  paid_at?: string;
  notes?: string;
  created_at: string;
  affiliate?: {
    referral_code: string;
    paypal_email?: string;
    check_payable_to?: string;
    mailing_address?: string;
    user?: {
      email: string;
      full_name: string;
    };
  };
  commissions?: any[];
}

export default function AdminAffiliatePayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [pendingCommissions, setPendingCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayout, setProcessingPayout] = useState<string | null>(null);
  const [selectedAffiliate, setSelectedAffiliate] = useState<string>('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [showCreatePayout, setShowCreatePayout] = useState(false);
  const supabase = createClientSupabaseClient();

  useEffect(() => {
    fetchPayouts();
    fetchPendingCommissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchPayouts() {
    try {
      // Check session first
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      console.log('Session check:', {
        hasSession: !!session,
        userEmail: session?.user?.email,
        userId: session?.user?.id,
        sessionError,
      });

      if (!session) {
        console.error('❌ NO SESSION - User not logged in');
        setLoading(false);
        return;
      }

      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin, email')
        .eq('id', session.user.id)
        .single();

      console.log('Profile check:', {
        profile,
        profileError,
        isAdmin: profile?.is_admin,
      });

      if (!profile?.is_admin) {
        console.error('❌ NOT ADMIN - User does not have admin privileges');
        setLoading(false);
        return;
      }

      console.log('✅ Session valid, user is admin, fetching payouts...');

      const { data: payoutsData, error } = await supabase
        .from('payouts')
        .select(
          `
          *,
          affiliates!inner (
            referral_code,
            paypal_email,
            check_payable_to,
            mailing_address,
            user_id
          )
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user details
      const payoutsWithUsers = await Promise.all(
        (payoutsData || []).map(async (payout: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', payout.affiliates.user_id)
            .single();

          return {
            ...payout,
            affiliate: {
              ...payout.affiliates,
              user: profile,
            },
          };
        })
      );

      setPayouts(payoutsWithUsers);
    } catch (error) {
      console.error('Error fetching payouts:', error);
      toast.error('Failed to load payouts');
    }
  }

  async function fetchPendingCommissions() {
    try {
      // Get approved commissions grouped by affiliate
      const { data: commissions, error } = await supabase
        .from('commissions')
        .select(
          `
          *,
          affiliates!inner (
            id,
            referral_code,
            paypal_email,
            check_payable_to,
            payment_method,
            user_id
          )
        `
        )
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by affiliate and calculate totals
      const groupedCommissions = new Map();

      for (const commission of commissions || []) {
        const affiliateId = commission.affiliate_id;
        if (!groupedCommissions.has(affiliateId)) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', commission.affiliates.user_id)
            .single();

          groupedCommissions.set(affiliateId, {
            affiliate_id: affiliateId,
            affiliate: {
              ...commission.affiliates,
              user: profile,
            },
            total_amount: 0,
            commission_count: 0,
            commissions: [],
          });
        }

        const group = groupedCommissions.get(affiliateId);
        group.total_amount += parseFloat(commission.amount);
        group.commission_count++;
        group.commissions.push(commission);
      }

      setPendingCommissions(Array.from(groupedCommissions.values()));
    } catch (error) {
      console.error('Error fetching pending commissions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createPayout() {
    if (!selectedAffiliate || !payoutAmount) {
      toast.error('Please select an affiliate and enter amount');
      return;
    }

    setProcessingPayout('creating');
    try {
      // Get affiliate details
      const pendingAffiliate = pendingCommissions.find(
        p => p.affiliate_id === selectedAffiliate
      );

      if (!pendingAffiliate) {
        throw new Error('Affiliate not found');
      }

      // Check if tax form is on file
      if (!pendingAffiliate.affiliate.tax_form_completed) {
        toast.error('Tax form must be on file before processing payouts');
        setProcessingPayout(null);
        return;
      }

      // Create payout record
      const { data: payout, error: payoutError } = await supabase
        .from('payouts')
        .insert({
          affiliate_id: selectedAffiliate,
          amount: payoutAmount,
          status: 'pending',
          payment_method: pendingAffiliate.affiliate.payment_method || 'paypal',
          notes: payoutNotes,
        })
        .select()
        .single();

      if (payoutError) throw payoutError;

      // Update commissions to paid status
      const commissionIds = pendingAffiliate.commissions.map((c: any) => c.id);
      const { error: updateError } = await supabase
        .from('commissions')
        .update({
          status: 'paid',
          payout_id: payout.id,
        })
        .in('id', commissionIds);

      if (updateError) throw updateError;

      toast.success('Payout created successfully');
      setShowCreatePayout(false);
      setSelectedAffiliate('');
      setPayoutAmount('');
      setPayoutNotes('');
      await fetchPayouts();
      await fetchPendingCommissions();
    } catch (error) {
      console.error('Error creating payout:', error);
      toast.error('Failed to create payout');
    } finally {
      setProcessingPayout(null);
    }
  }

  async function markPayoutComplete(payoutId: string, transactionId: string) {
    setProcessingPayout(payoutId);
    try {
      const { error } = await supabase
        .from('payouts')
        .update({
          status: 'completed',
          transaction_id: transactionId,
          paid_at: new Date().toISOString(),
        })
        .eq('id', payoutId);

      if (error) throw error;

      toast.success('Payout marked as complete');
      await fetchPayouts();
    } catch (error) {
      console.error('Error updating payout:', error);
      toast.error('Failed to update payout');
    } finally {
      setProcessingPayout(null);
    }
  }

  function exportPayouts() {
    const csv = [
      [
        'Date',
        'Affiliate',
        'Email',
        'Amount',
        'Method',
        'Status',
        'Transaction ID',
      ].join(','),
      ...payouts.map(p =>
        [
          new Date(p.created_at).toLocaleDateString(),
          p.affiliate?.user?.full_name || '',
          p.affiliate?.user?.email || '',
          p.amount,
          p.payment_method,
          p.status,
          p.transaction_id || '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payouts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalPending = pendingCommissions.reduce(
    (sum, p) => sum + p.total_amount,
    0
  );
  const totalPaid = payouts
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <Breadcrumb
        homeHref="/admin"
        homeLabel="Admin Dashboard"
        items={[
          { label: 'Affiliates', href: '/admin/affiliates' },
          { label: 'Payouts' },
        ]}
      />

      <AffiliateAdminNav />

      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Payout Management</h2>
        </div>
        <div className="flex gap-3">
          <Button onClick={exportPayouts} variant="secondary">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setShowCreatePayout(true)}>
            <Send className="h-4 w-4 mr-2" />
            Create Payout
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Payouts</p>
                <p className="text-2xl font-bold">${totalPending.toFixed(2)}</p>
              </div>
              <Clock className="h-8 w-8 text-warning-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Paid Out</p>
                <p className="text-2xl font-bold">${totalPaid.toFixed(2)}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Affiliates to Pay</p>
                <p className="text-2xl font-bold">
                  {pendingCommissions.length}
                </p>
              </div>
              <User className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Commissions */}
      {pendingCommissions.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-warning-500" />
              Affiliates with Pending Commissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Affiliate
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Tax Form
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Payment Method
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Commissions
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Total Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingCommissions.map(pending => (
                    <tr key={pending.affiliate_id}>
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {pending.affiliate?.user?.full_name || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {pending.affiliate?.referral_code}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {pending.affiliate?.tax_form_completed ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {pending.affiliate?.tax_form_type || 'On File'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-error-100 text-error-800">
                            <XCircle className="h-3 w-3 mr-1" />
                            Missing
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <span className="capitalize">
                            {pending.affiliate?.payment_method || 'paypal'}
                          </span>
                          {pending.affiliate?.payment_method === 'paypal' && (
                            <div className="text-xs text-gray-500">
                              {pending.affiliate?.paypal_email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {pending.commission_count}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        ${pending.total_amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Affiliate
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Method
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Transaction ID
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payouts.map(payout => (
                  <tr key={payout.id}>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(payout.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {payout.affiliate?.user?.full_name || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {payout.affiliate?.user?.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      ${parseFloat(payout.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {payout.payment_method === 'paypal' && (
                          <CreditCard className="h-3 w-3 mr-1" />
                        )}
                        {payout.payment_method === 'check' && (
                          <FileText className="h-3 w-3 mr-1" />
                        )}
                        {payout.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          payout.status === 'completed'
                            ? 'bg-success-100 text-success-800'
                            : payout.status === 'failed'
                              ? 'bg-error-100 text-error-800'
                              : payout.status === 'processing'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-warning-100 text-warning-800'
                        }`}
                      >
                        {payout.status === 'completed' && (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        )}
                        {payout.status === 'failed' && (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        {payout.status === 'pending' && (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {payout.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {payout.transaction_id || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {payout.status === 'pending' && (
                        <button
                          onClick={() => {
                            const txId = prompt('Enter transaction ID:');
                            if (txId) markPayoutComplete(payout.id, txId);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Mark Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Payout Modal */}
      {showCreatePayout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Create Payout</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Affiliate
                </label>
                <select
                  value={selectedAffiliate}
                  onChange={e => {
                    setSelectedAffiliate(e.target.value);
                    const pending = pendingCommissions.find(
                      p => p.affiliate_id === e.target.value
                    );
                    if (pending) {
                      setPayoutAmount(pending.total_amount.toFixed(2));
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select...</option>
                  {pendingCommissions.map(pending => (
                    <option
                      key={pending.affiliate_id}
                      value={pending.affiliate_id}
                    >
                      {pending.affiliate?.user?.full_name} - $
                      {pending.total_amount.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={payoutAmount}
                  onChange={e => setPayoutAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={payoutNotes}
                  onChange={e => setPayoutNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  placeholder="Any notes about this payout..."
                />
              </div>

              {selectedAffiliate && (
                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  {(() => {
                    const pending = pendingCommissions.find(
                      p => p.affiliate_id === selectedAffiliate
                    );
                    if (!pending) return null;
                    return (
                      <>
                        <p className="font-medium">Payment Details:</p>
                        <p className="text-gray-600">
                          Method:{' '}
                          {pending.affiliate?.payment_method || 'paypal'}
                        </p>
                        {pending.affiliate?.payment_method === 'paypal' && (
                          <p className="text-gray-600">
                            PayPal: {pending.affiliate?.paypal_email}
                          </p>
                        )}
                        {pending.affiliate?.payment_method === 'check' && (
                          <>
                            <p className="text-gray-600">
                              Payable to: {pending.affiliate?.check_payable_to}
                            </p>
                            <p className="text-gray-600">
                              Address: {pending.affiliate?.mailing_address}
                            </p>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                onClick={createPayout}
                disabled={processingPayout === 'creating'}
              >
                {processingPayout === 'creating'
                  ? 'Creating...'
                  : 'Create Payout'}
              </Button>
              <Button
                onClick={() => {
                  setShowCreatePayout(false);
                  setSelectedAffiliate('');
                  setPayoutAmount('');
                  setPayoutNotes('');
                }}
                variant="secondary"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
