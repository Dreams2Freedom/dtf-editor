'use client';

import { useState, useEffect } from 'react';
import {
  User,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Eye,
  Edit,
  CreditCard,
  Ban,
  CheckCircle,
  MoreVertical,
  CheckSquare,
  Square,
  UserX,
  UserCheck,
  Mail,
  Trash2,
  UserCog,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { UserEditModal } from './UserEditModal';
import { CreditAdjustmentModal } from './CreditAdjustmentModal';
import { BulkCreditModal } from './BulkCreditModal';
import { EmailUserModal } from './EmailUserModal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import type { AdminUserListResponse, AdminUserListParams } from '@/types/admin';

export function UserListTable() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUserListResponse['users']>([]);
  const [total, setTotal] = useState(0);
  const [params, setParams] = useState<AdminUserListParams>({
    page: 1,
    limit: 10,
    search: '',
    status: 'all',
    userType: 'all',
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const [dropdownUserId, setDropdownUserId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<
    AdminUserListResponse['users'][0] | null
  >(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set()
  );
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkCreditModalOpen, setBulkCreditModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [params]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/admin/users?${queryParams}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data: AdminUserListResponse = await response.json();
      setUsers(data.users);
      setTotal(data.total);
      // Clear selections when data changes
      setSelectedUserIds(new Set());
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setParams({ ...params, search: value, page: 1 });
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUserIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUserIds(newSelection);
  };

  const selectAllUsers = () => {
    const allIds = new Set(users.map(user => user.id));
    setSelectedUserIds(allIds);
  };

  const deselectAllUsers = () => {
    setSelectedUserIds(new Set());
  };

  const handleExport = async (
    scope: 'all' | 'selected',
    format: 'csv' | 'json'
  ) => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('format', format);

      if (scope === 'selected' && selectedUserIds.size > 0) {
        queryParams.append('userIds', Array.from(selectedUserIds).join(','));
      }

      const response = await fetch(`/api/admin/users/export?${queryParams}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const fileNameMatch = contentDisposition?.match(/filename="(.+)"/);
      const fileName = fileNameMatch
        ? fileNameMatch[1]
        : `users-export.${format}`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(
        `Exported ${scope === 'all' ? 'all users' : `${selectedUserIds.size} users`} as ${format.toUpperCase()}`
      );
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export users');
    }
  };

  const handleExportUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/export`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const fileNameMatch = contentDisposition?.match(/filename="(.+)"/);
      const fileName = fileNameMatch
        ? fileNameMatch[1]
        : `user-data-export.json`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('User data exported successfully');
      setDropdownUserId(null);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export user data');
    }
  };

  const handleImpersonateUser = async (
    user: AdminUserListResponse['users'][0]
  ) => {
    if (
      !confirm(
        `Are you sure you want to impersonate ${user.email}? You will view the application as this user.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${user.id}/impersonate`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start impersonation');
      }

      const result = await response.json();
      toast.success(result.message);

      // Redirect to user dashboard
      window.location.href = '/dashboard';
    } catch (error: any) {
      console.error('Impersonation error:', error);
      toast.error(error.message || 'Failed to impersonate user');
    } finally {
      setDropdownUserId(null);
    }
  };

  const handleBulkAction = async (
    action: 'suspend' | 'activate' | 'delete' | 'email' | 'credits'
  ) => {
    if (selectedUserIds.size === 0) {
      toast.error('No users selected');
      return;
    }

    const selectedUsers = users.filter(user => selectedUserIds.has(user.id));

    if (
      action === 'delete' &&
      !confirm(`Are you sure you want to delete ${selectedUserIds.size} users?`)
    ) {
      return;
    }

    if (
      action === 'suspend' &&
      !confirm(
        `Are you sure you want to suspend ${selectedUserIds.size} users?`
      )
    ) {
      return;
    }

    setBulkActionLoading(true);
    try {
      const response = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action,
          userIds: Array.from(selectedUserIds),
        }),
      });

      if (!response.ok) {
        throw new Error('Bulk action failed');
      }

      const result = await response.json();
      toast.success(`Successfully ${action}ed ${result.affected} users`);

      // Refresh the list
      fetchUsers();
      setSelectedUserIds(new Set());
    } catch (error) {
      console.error('Bulk action error:', error);
      toast.error(`Failed to ${action} users`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleStatusFilter = (status: AdminUserListParams['status']) => {
    setParams({ ...params, status, page: 1 });
  };

  const handleUserTypeFilter = (userType: AdminUserListParams['userType']) => {
    setParams({ ...params, userType, page: 1 });
  };

  const handleSort = (sortBy: AdminUserListParams['sort_by']) => {
    setParams({
      ...params,
      sort_by: sortBy,
      sort_order:
        params.sort_by === sortBy && params.sort_order === 'asc'
          ? 'desc'
          : 'asc',
    });
  };

  const handlePageChange = (page: number) => {
    setParams({ ...params, page });
  };

  const handleEditUser = (user: AdminUserListResponse['users'][0]) => {
    setSelectedUser(user);
    setEditModalOpen(true);
    setDropdownUserId(null);
  };

  const handleCreditAdjustment = (user: AdminUserListResponse['users'][0]) => {
    setSelectedUser(user);
    setCreditModalOpen(true);
    setDropdownUserId(null);
  };

  const handleUserUpdate = (updatedUser: any) => {
    // Update user in the list
    setUsers(
      users.map(u =>
        u.id === updatedUser.id
          ? {
              ...u,
              email: updatedUser.email,
              full_name: updatedUser.full_name,
              plan: updatedUser.plan,
              status: updatedUser.status,
            }
          : u
      )
    );
  };

  const handleCreditUpdate = (userId: string, newBalance: number) => {
    // Update user credits in the list
    setUsers(
      users.map(u =>
        u.id === userId
          ? {
              ...u,
              credits_remaining: newBalance,
            }
          : u
      )
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Smart badge system to distinguish user types
  const getUserTypeBadge = (
    user: any
  ): {
    label: string;
    variant: 'default' | 'secondary' | 'success' | 'info' | 'warning';
  } => {
    const { subscription_tier, stripe_customer_id } = user;

    // Priority 1: Active subscription (subscription_tier is not 'free')
    if (subscription_tier && subscription_tier !== 'free') {
      const tierLower = subscription_tier.toLowerCase();
      // Capitalize first letter for display
      const tierLabel =
        subscription_tier.charAt(0).toUpperCase() + subscription_tier.slice(1);

      // Color mapping: Professional (gold), Starter (purple), Basic (green)
      if (tierLower === 'professional' || tierLower === 'pro') {
        return { label: 'Professional', variant: 'warning' }; // gold/yellow
      } else if (tierLower === 'starter') {
        return { label: 'Starter', variant: 'info' }; // purple/blue
      } else if (tierLower === 'basic') {
        return { label: 'Basic', variant: 'success' }; // green
      }
      // Fallback for any other subscription
      return { label: tierLabel, variant: 'success' };
    }

    // Priority 2: Has made purchases but no active subscription (pay-as-you-go)
    if (stripe_customer_id) {
      return { label: 'Pay-as-you-go', variant: 'default' }; // blue
    }

    // Priority 3: Free user (never purchased)
    return { label: 'Free', variant: 'secondary' }; // gray
  };

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge variant="success">
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="error">
        <Ban className="w-3 h-3 mr-1" />
        Suspended
      </Badge>
    );
  };

  const totalPages = Math.ceil(total / params.limit!);

  return (
    <div className="bg-white shadow-sm rounded-lg">
      {/* Header */}
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Users</h3>
            <p className="mt-1 text-sm text-gray-500">Total users: {total}</p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('all', 'csv')}>
                  Export All (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('all', 'json')}>
                  Export All (JSON)
                </DropdownMenuItem>
                {selectedUserIds.size > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleExport('selected', 'csv')}
                    >
                      Export Selected ({selectedUserIds.size}) (CSV)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleExport('selected', 'json')}
                    >
                      Export Selected ({selectedUserIds.size}) (JSON)
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search by email or name..."
              value={params.search || ''}
              onChange={e => handleSearch(e.target.value)}
              leftIcon={<Search className="h-5 w-5" />}
            />
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-48">
            <Select
              value={params.status}
              onChange={e =>
                handleStatusFilter(
                  e.target.value as AdminUserListParams['status']
                )
              }
              leftIcon={<Filter className="h-5 w-5" />}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </Select>
          </div>

          {/* User Type Filter */}
          <div className="w-full sm:w-48">
            <Select
              value={params.userType || 'all'}
              onChange={e =>
                handleUserTypeFilter(
                  e.target.value as AdminUserListParams['userType']
                )
              }
              leftIcon={<User className="h-5 w-5" />}
            >
              <option value="all">All Users</option>
              <option value="paid">Paid Customers</option>
              <option value="payasyougo">Pay-as-you-go</option>
              <option value="subscribers">Subscribers</option>
              <option value="free">Free Users</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedUserIds.size > 0 && (
        <div className="px-4 py-3 bg-info-50 border-b border-info-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-info-900">
                {selectedUserIds.size} user
                {selectedUserIds.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={deselectAllUsers}
                className="text-sm text-info-600 hover:text-info-800"
              >
                Clear selection
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('activate')}
                disabled={bulkActionLoading}
                className="bg-success-100 text-success-700 hover:bg-success-200 border-success-300"
              >
                <UserCheck className="w-4 h-4 mr-1" />
                Activate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('suspend')}
                disabled={bulkActionLoading}
                className="bg-warning-100 text-warning-700 hover:bg-warning-200 border-warning-300"
              >
                <UserX className="w-4 h-4 mr-1" />
                Suspend
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEmailModalOpen(true)}
                disabled={bulkActionLoading}
                className="bg-info-100 text-info-700 hover:bg-info-200 border-info-300"
              >
                <Mail className="w-4 h-4 mr-1" />
                Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkCreditModalOpen(true)}
                disabled={bulkActionLoading}
                className="bg-primary-100 text-primary-700 hover:bg-primary-200 border-primary-300"
              >
                <CreditCard className="w-4 h-4 mr-1" />
                Add Credits
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('delete')}
                disabled={bulkActionLoading}
                className="bg-error-100 text-error-700 hover:bg-error-200 border-error-300"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 w-12">
                <button
                  onClick={() =>
                    selectedUserIds.size === users.length
                      ? deselectAllUsers()
                      : selectAllUsers()
                  }
                  className="text-gray-400 hover:text-gray-600"
                >
                  {selectedUserIds.size === users.length ? (
                    <CheckSquare className="w-5 h-5" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('email')}
              >
                User
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Plan
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('credits_remaining')}
              >
                Credits
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('created_at')}
              >
                Joined
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center">
                  <div className="animate-pulse">Loading users...</div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 w-12">
                    <button
                      onClick={() => toggleUserSelection(user.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {selectedUserIds.has(user.id) ? (
                        <CheckSquare className="w-5 h-5" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.full_name || 'No name'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const badge = getUserTypeBadge(user);
                      return (
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.credits_remaining}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(user.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="relative">
                      <button
                        onClick={() =>
                          setDropdownUserId(
                            dropdownUserId === user.id ? null : user.id
                          )
                        }
                        className="text-gray-400 hover:text-gray-500 focus:outline-none"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>

                      {dropdownUserId === user.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setDropdownUserId(null)}
                          />
                          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                            <div className="py-1">
                              <a
                                href={`/admin/users/${user.id}`}
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Eye className="mr-3 h-4 w-4" />
                                View Details
                              </a>
                              <button
                                onClick={() => handleEditUser(user)}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Edit className="mr-3 h-4 w-4" />
                                Edit User
                              </button>
                              <button
                                onClick={() => handleCreditAdjustment(user)}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <CreditCard className="mr-3 h-4 w-4" />
                                Adjust Credits
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUserIds(new Set([user.id]));
                                  setEmailModalOpen(true);
                                  setDropdownUserId(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Mail className="mr-3 h-4 w-4" />
                                Send Email
                              </button>
                              <div className="border-t border-gray-100"></div>
                              <button
                                onClick={() => handleExportUser(user.id)}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Download className="mr-3 h-4 w-4" />
                                Export Data
                              </button>
                              <button
                                onClick={() => handleImpersonateUser(user)}
                                className="flex items-center w-full px-4 py-2 text-sm text-purple-700 hover:bg-purple-50"
                              >
                                <UserCog className="mr-3 h-4 w-4" />
                                View as User
                              </button>
                              <button className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                {user.status === 'active' ? (
                                  <>
                                    <Ban className="mr-3 h-4 w-4" />
                                    Suspend User
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="mr-3 h-4 w-4" />
                                    Activate User
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing{' '}
              <span className="font-medium">
                {(params.page! - 1) * params.limit! + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium">
                {Math.min(params.page! * params.limit!, total)}
              </span>{' '}
              of <span className="font-medium">{total}</span> results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(params.page! - 1)}
                disabled={params.page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1;
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= params.page! - 1 && page <= params.page! + 1)
                ) {
                  return (
                    <Button
                      key={page}
                      variant={page === params.page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Button>
                  );
                } else if (
                  page === params.page! - 2 ||
                  page === params.page! + 2
                ) {
                  return (
                    <span key={page} className="px-1">
                      ...
                    </span>
                  );
                }
                return null;
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(params.page! + 1)}
                disabled={params.page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {selectedUser && (
        <UserEditModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          onUpdate={handleUserUpdate}
        />
      )}

      {/* Credit Adjustment Modal */}
      {selectedUser && (
        <CreditAdjustmentModal
          isOpen={creditModalOpen}
          onClose={() => {
            setCreditModalOpen(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          onUpdate={newBalance =>
            handleCreditUpdate(selectedUser.id, newBalance)
          }
        />
      )}

      {/* Bulk Credit Adjustment Modal */}
      <BulkCreditModal
        isOpen={bulkCreditModalOpen}
        onClose={() => setBulkCreditModalOpen(false)}
        selectedCount={selectedUserIds.size}
        selectedUserIds={Array.from(selectedUserIds)}
        onSuccess={() => {
          fetchUsers();
          setSelectedUserIds(new Set());
        }}
      />

      {/* Email Modal */}
      <EmailUserModal
        isOpen={emailModalOpen}
        onClose={() => {
          setEmailModalOpen(false);
          setSelectedUserIds(new Set());
        }}
        selectedUsers={users
          .filter(u => selectedUserIds.has(u.id))
          .map(u => ({
            id: u.id,
            email: u.email,
            first_name: u.full_name?.split(' ')[0],
            last_name: u.full_name?.split(' ').slice(1).join(' '),
          }))}
        onSuccess={() => {
          setEmailModalOpen(false);
          setSelectedUserIds(new Set());
          toast.success('Email sent successfully');
        }}
      />
    </div>
  );
}
