'use client';

import { useState, useEffect } from 'react';
import { 
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
  DollarSign,
  Image,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/lib/toast';
import { UserEditModal } from './UserEditModal';
import { CreditAdjustmentModal } from './CreditAdjustmentModal';

interface UserDetailViewProps {
  userId: string;
}

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
  subscription_id?: string;
  subscription_status?: string;
  subscription_end_date?: string;
  total_credits_used: number;
  images_processed: number;
  credit_transactions: Array<{
    id: string;
    amount: number;
    balance_after: number;
    description: string;
    created_at: string;
  }>;
  recent_activity: Array<{
    id: string;
    type: string;
    description: string;
    created_at: string;
    metadata?: any;
  }>;
  api_usage_summary: {
    total_operations: number;
    by_service: {
      deep_image: number;
      clipping_magic: number;
      vectorizer: number;
      openai: number;
    };
    total_cost: number;
    total_revenue: number;
    profit_margin: number;
  };
}

export function UserDetailView({ userId }: UserDetailViewProps) {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [creditModalOpen, setCreditModalOpen] = useState(false);

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/details`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }

      const data = await response.json();
      setUser(data);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const handleUserUpdate = (updatedUser: any) => {
    setUser(prev => prev ? {
      ...prev,
      email: updatedUser.email,
      full_name: updatedUser.full_name,
      plan: updatedUser.plan,
      status: updatedUser.status
    } : null);
    fetchUserDetails(); // Refresh all data
  };

  const handleCreditUpdate = (newBalance: number) => {
    setUser(prev => prev ? {
      ...prev,
      credits_remaining: newBalance
    } : null);
    fetchUserDetails(); // Refresh to get new transactions
  };

  const handleStatusToggle = async () => {
    if (!user) return;
    
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update user status');
      }

      toast.success(`User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
      setUser({ ...user, status: newStatus });
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const openStripeCustomer = () => {
    if (user?.stripe_customer_id) {
      window.open(`https://dashboard.stripe.com/customers/${user.stripe_customer_id}`, '_blank');
    }
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free':
        return 'bg-gray-100 text-gray-800';
      case 'basic':
        return 'bg-green-100 text-green-800';
      case 'starter':
        return 'bg-blue-100 text-blue-800';
      case 'pro':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="bg-gray-200 h-32 rounded-lg"></div>
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
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">User not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary-blue flex items-center justify-center">
                <User className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {user.full_name || 'No name'}
                </h2>
                <p className="text-gray-500">{user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlanBadgeColor(user.plan)}`}>
                    {user.plan}
                  </span>
                  {user.status === 'active' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <Ban className="w-3 h-3 mr-1" />
                      Suspended
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setEditModalOpen(true)}
                leftIcon={<Edit className="h-4 w-4" />}
              >
                Edit
              </Button>
              <Button
                variant={user.status === 'active' ? 'destructive' : 'success'}
                onClick={handleStatusToggle}
                leftIcon={user.status === 'active' ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
              >
                {user.status === 'active' ? 'Suspend' : 'Activate'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  <label className="text-sm font-medium text-gray-500">User ID</label>
                  <p className="mt-1 text-gray-900 font-mono text-sm">{user.id}</p>
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
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Updated</label>
                  <p className="mt-1 text-gray-900">{formatDate(user.updated_at)}</p>
                </div>
                {user.stripe_customer_id && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Stripe Customer</label>
                    <p className="mt-1">
                      <button
                        onClick={openStripeCustomer}
                        className="text-primary-blue hover:underline text-sm font-mono"
                      >
                        {user.stripe_customer_id}
                      </button>
                    </p>
                  </div>
                )}
                {user.subscription_status && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Subscription Status</label>
                    <p className="mt-1">
                      <Badge variant={user.subscription_status === 'active' ? 'success' : 'secondary'}>
                        {user.subscription_status}
                      </Badge>
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Usage Analytics */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{user.images_processed}</p>
                  <p className="text-sm text-gray-500">Images Processed</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{user.total_credits_used}</p>
                  <p className="text-sm text-gray-500">Credits Used</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(user.api_usage_summary.total_revenue)}
                  </p>
                  <p className="text-sm text-gray-500">Revenue</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {user.api_usage_summary.profit_margin.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-500">Profit Margin</p>
                </div>
              </div>
              
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">API Usage by Service</h4>
                <div className="space-y-2">
                  {Object.entries(user.api_usage_summary.by_service).map(([service, count]) => (
                    <div key={service} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 capitalize">
                        {service.replace('_', ' ')}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{count} operations</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Credit Transactions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Credit Transactions</CardTitle>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {user.credit_transactions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No transactions yet</p>
              ) : (
                <div className="space-y-3">
                  {user.credit_transactions.slice(0, 10).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{transaction.description}</p>
                        <p className="text-xs text-gray-500">{formatDate(transaction.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                        </p>
                        <p className="text-xs text-gray-500">Balance: {transaction.balance_after}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Credits & Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Credits & Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-4">
                <p className="text-4xl font-bold text-gray-900">{user.credits_remaining}</p>
                <p className="text-sm text-gray-500">Credits Remaining</p>
              </div>
              <Button
                variant="default"
                fullWidth
                onClick={() => setCreditModalOpen(true)}
                leftIcon={<CreditCard className="h-4 w-4" />}
              >
                Adjust Credits
              </Button>
              {user.stripe_customer_id && (
                <Button
                  variant="outline"
                  fullWidth
                  onClick={openStripeCustomer}
                  leftIcon={<DollarSign className="h-4 w-4" />}
                >
                  View in Stripe
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" fullWidth leftIcon={<Mail className="h-4 w-4" />}>
                Send Email
              </Button>
              <Button variant="outline" fullWidth leftIcon={<RefreshCw className="h-4 w-4" />}>
                Reset Password
              </Button>
              <Button variant="outline" fullWidth leftIcon={<Download className="h-4 w-4" />}>
                Export Data
              </Button>
              <Button variant="outline" fullWidth leftIcon={<Shield className="h-4 w-4" />}>
                View Audit Log
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {user.recent_activity.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {user.recent_activity.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="text-sm">
                      <p className="text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500">{formatDate(activity.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      {user && (
        <>
          <UserEditModal
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            user={user}
            onUpdate={handleUserUpdate}
          />
          <CreditAdjustmentModal
            isOpen={creditModalOpen}
            onClose={() => setCreditModalOpen(false)}
            user={user}
            onUpdate={handleCreditUpdate}
          />
        </>
      )}
    </div>
  );
}