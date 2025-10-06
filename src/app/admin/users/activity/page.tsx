'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  Search,
  Activity,
  Clock,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { toast } from '@/lib/toast';

interface UserActivity {
  id: string;
  email: string;
  name: string;
  lastActivity: string | null;
  lastActivityFormatted: string;
  status: 'active' | 'today' | 'recent' | 'inactive';
  plan: string;
  joinedAt: string;
}

interface ActivityMetrics {
  activeLastHour: number;
  activeToday: number;
  activeThisWeek: number;
  activeThisMonth: number;
  totalUsers: number;
  neverActive: number;
}

export default function UserActivityPage() {
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserActivity[]>([]);
  const [metrics, setMetrics] = useState<ActivityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchUserActivity();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [userActivity, searchQuery, statusFilter]);

  const fetchUserActivity = async () => {
    try {
      const response = await fetch('/api/admin/users/activity');
      if (!response.ok) {
        throw new Error('Failed to fetch user activity');
      }

      const data = await response.json();
      setUserActivity(data.users);
      setMetrics(data.metrics);
    } catch (error) {
      console.error('Error fetching user activity:', error);
      toast.error('Failed to load user activity');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = userActivity;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        user =>
          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'success' as const, label: 'Active Now' },
      today: { variant: 'info' as const, label: 'Active Today' },
      recent: { variant: 'warning' as const, label: 'This Week' },
      inactive: { variant: 'secondary' as const, label: 'Inactive' },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.inactive;

    return <Badge variant={config.variant}>{config.label}</Badge>;
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Activity</h1>
          <p className="text-gray-600 mt-1">
            Monitor user engagement and activity patterns
          </p>
        </div>

        {/* Metrics Cards */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Now</p>
                    <p className="text-2xl font-bold">
                      {metrics.activeLastHour}
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-success-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Today</p>
                    <p className="text-2xl font-bold">{metrics.activeToday}</p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">This Week</p>
                    <p className="text-2xl font-bold">
                      {metrics.activeThisWeek}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-warning-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">This Month</p>
                    <p className="text-2xl font-bold">
                      {metrics.activeThisMonth}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold">{metrics.totalUsers}</p>
                  </div>
                  <Users className="w-8 h-8 text-indigo-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Never Active</p>
                    <p className="text-2xl font-bold">{metrics.neverActive}</p>
                  </div>
                  <UserX className="w-8 h-8 text-error-500" />
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
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active Now</option>
            <option value="today">Active Today</option>
            <option value="recent">This Week</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* User Activity Table */}
        <Card>
          <CardHeader>
            <CardTitle>User Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">User</th>
                    <th className="text-left py-3 px-4">Last Activity</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Plan</th>
                    <th className="text-left py-3 px-4">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-8 text-gray-500"
                      >
                        No users found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm">
                            {user.lastActivityFormatted}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(user.status)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="secondary">{user.plan}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {new Date(user.joinedAt).toLocaleDateString()}
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
