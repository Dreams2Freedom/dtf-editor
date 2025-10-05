'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { UserEditModal } from '@/components/admin/users/UserEditModal';
import { 
  ArrowLeft,
  User,
  Mail,
  Calendar,
  CreditCard,
  Activity,
  Shield,
  Edit,
  Ban,
  CheckCircle,
  Download,
  RefreshCw,
  Clock,
  DollarSign
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface UserDetails {
  id: string;
  email: string;
  full_name?: string;
  plan: string;
  status: 'active' | 'suspended';
  credits_remaining: number;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string;
  stripe_customer_id?: string;
  credit_transactions: Array<{
    id: string;
    type: 'purchase' | 'usage' | 'refund' | 'reset' | 'manual';
    amount: number;
    description: string;
    created_at: string;
  }>;
  recent_uploads: Array<{
    id: string;
    filename: string;
    file_type: string;
    status: string;
    created_at: string;
  }>;
  usage_stats: {
    last_30_days: number;
    total_uploads: number;
  };
  stripe_info?: {
    customer_id: string;
    subscription_status: string | null;
  };
}

export default function UserDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    fetchUserDetails();
  }, [params.id]);

  const fetchUserDetails = async () => {
    try {
      const response = await fetch(`/api/admin/users/${params.id}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }

      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Failed to load user details');
      router.push('/admin/users');
    } finally {
      setLoading(false);
    }
  };

  const handleUserUpdate = (updatedUser: any) => {
    // Update user data
    setUser(prev => prev ? {
      ...prev,
      email: updatedUser.email,
      full_name: updatedUser.full_name,
      plan: updatedUser.plan,
      status: updatedUser.status
    } : null);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTransactionType = (type: string) => {
    const types: Record<string, { label: string; color: string }> = {
      purchase: { label: 'Purchase', color: 'text-success-600' },
      usage: { label: 'Usage', color: 'text-blue-600' },
      refund: { label: 'Refund', color: 'text-orange-600' },
      reset: { label: 'Monthly Reset', color: 'text-purple-600' },
      manual: { label: 'Manual Adjustment', color: 'text-gray-600' }
    };
    return types[type] || { label: type, color: 'text-gray-600' };
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'starter':
        return 'bg-blue-100 text-blue-800';
      case 'basic':
        return 'bg-success-100 text-success-800';
      case 'pro':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-gray-200 rounded-lg"></div>
              <div className="h-96 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="space-y-6">
              <div className="h-48 bg-gray-200 rounded-lg"></div>
              <div className="h-48 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">User not found</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/users')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditModalOpen(true)} className="btn btn-secondary">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </button>
            <button className={`btn ${user.status === 'active' ? 'btn-danger' : 'btn-primary'}`}>
              {user.status === 'active' ? (
                <>
                  <Ban className="h-4 w-4 mr-2" />
                  Suspend
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Activate
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* User Information */}
            <Card>
              <CardHeader>
                <CardTitle>User Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Full Name</label>
                    <p className="mt-1 text-gray-900">{user.full_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="mt-1 text-gray-900">{user.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">User ID</label>
                    <p className="mt-1 text-gray-900 font-mono text-sm">{user.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <p className="mt-1">
                      {user.status === 'active' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-error-100 text-error-800">
                          <Ban className="w-3 h-3 mr-1" />
                          Suspended
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Joined</label>
                    <p className="mt-1 text-gray-900">{formatDate(user.created_at)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Sign In</label>
                    <p className="mt-1 text-gray-900">
                      {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Credit Transactions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Credit Transactions</CardTitle>
                  <button className="text-sm text-primary-blue hover:underline">
                    View All
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {user.credit_transactions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No transactions yet</p>
                ) : (
                  <div className="space-y-3">
                    {user.credit_transactions.map((transaction) => {
                      const { label, color } = formatTransactionType(transaction.type);
                      return (
                        <div key={transaction.id} className="flex items-center justify-between py-3 border-b last:border-0">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{transaction.description}</p>
                            <p className="text-sm text-gray-500">
                              <span className={`font-medium ${color}`}>{label}</span>
                              {' • '}
                              {formatDate(transaction.created_at)}
                            </p>
                          </div>
                          <div className={`font-semibold ${transaction.amount > 0 ? 'text-success-600' : 'text-error-600'}`}>
                            {transaction.amount > 0 ? '+' : ''}{transaction.amount} credits
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Uploads */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Uploads</CardTitle>
                  <button className="text-sm text-primary-blue hover:underline">
                    View All
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {user.recent_uploads.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No uploads yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {user.recent_uploads.map((upload) => (
                          <tr key={upload.id}>
                            <td className="px-4 py-2 text-sm text-gray-900 truncate max-w-xs">
                              {upload.filename}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {upload.file_type}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                upload.status === 'completed' 
                                  ? 'bg-success-100 text-success-800'
                                  : upload.status === 'failed'
                                  ? 'bg-error-100 text-error-800'
                                  : 'bg-warning-100 text-warning-800'
                              }`}>
                                {upload.status}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {new Date(upload.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Plan & Credits */}
            <Card>
              <CardHeader>
                <CardTitle>Plan & Credits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Current Plan</label>
                  <p className="mt-1">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPlanBadgeColor(user.plan)}`}>
                      {user.plan}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Credits Remaining</label>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{user.credits_remaining}</p>
                </div>
                <div className="pt-4 space-y-2">
                  <button className="btn btn-primary w-full">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Adjust Credits
                  </button>
                  {user.stripe_customer_id && (
                    <button className="btn btn-secondary w-full">
                      <DollarSign className="h-4 w-4 mr-2" />
                      View in Stripe
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Usage Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Credits Used (30 days)</label>
                  <p className="mt-1 text-xl font-semibold text-gray-900">{user.usage_stats.last_30_days}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Uploads</label>
                  <p className="mt-1 text-xl font-semibold text-gray-900">{user.usage_stats.total_uploads}</p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <button className="btn btn-secondary w-full justify-start">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </button>
                <button className="btn btn-secondary w-full justify-start">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Password
                </button>
                <button className="btn btn-secondary w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </button>
                <button className="btn btn-secondary w-full justify-start">
                  <Shield className="h-4 w-4 mr-2" />
                  View Audit Log
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <UserEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        user={user}
        onUpdate={handleUserUpdate}
      />
    </AdminLayout>
  );
}