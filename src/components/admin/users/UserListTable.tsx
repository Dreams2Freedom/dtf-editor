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
  UserCog
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { UserEditModal } from './UserEditModal';
import { CreditAdjustmentModal } from './CreditAdjustmentModal';
import { BulkCreditModal } from './BulkCreditModal';
import { EmailUserModal } from './EmailUserModal';
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
    sort_by: 'created_at',
    sort_order: 'desc'
  });
  const [dropdownUserId, setDropdownUserId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserListResponse['users'][0] | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkCreditModalOpen, setBulkCreditModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

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
        credentials: 'include'
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

  const handleExport = async (scope: 'all' | 'selected', format: 'csv' | 'json') => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('format', format);
      
      if (scope === 'selected' && selectedUserIds.size > 0) {
        queryParams.append('userIds', Array.from(selectedUserIds).join(','));
      }

      const response = await fetch(`/api/admin/users/export?${queryParams}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const fileNameMatch = contentDisposition?.match(/filename="(.+)"/);
      const fileName = fileNameMatch ? fileNameMatch[1] : `users-export.${format}`;

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

      toast.success(`Exported ${scope === 'all' ? 'all users' : `${selectedUserIds.size} users`} as ${format.toUpperCase()}`);
      setExportDropdownOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export users');
    }
  };

  const handleExportUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/export`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const fileNameMatch = contentDisposition?.match(/filename="(.+)"/);
      const fileName = fileNameMatch ? fileNameMatch[1] : `user-data-export.json`;

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

  const handleImpersonateUser = async (user: AdminUserListResponse['users'][0]) => {
    if (!confirm(`Are you sure you want to impersonate ${user.email}? You will view the application as this user.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${user.id}/impersonate`, {
        method: 'POST',
        credentials: 'include'
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

  const handleBulkAction = async (action: 'suspend' | 'activate' | 'delete' | 'email' | 'credits') => {
    if (selectedUserIds.size === 0) {
      toast.error('No users selected');
      return;
    }

    const selectedUsers = users.filter(user => selectedUserIds.has(user.id));
    
    if (action === 'delete' && !confirm(`Are you sure you want to delete ${selectedUserIds.size} users?`)) {
      return;
    }

    if (action === 'suspend' && !confirm(`Are you sure you want to suspend ${selectedUserIds.size} users?`)) {
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

  const handleSort = (sortBy: AdminUserListParams['sort_by']) => {
    setParams({
      ...params,
      sort_by: sortBy,
      sort_order: params.sort_by === sortBy && params.sort_order === 'asc' ? 'desc' : 'asc'
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
    setUsers(users.map(u => u.id === updatedUser.id ? {
      ...u,
      email: updatedUser.email,
      full_name: updatedUser.full_name,
      plan: updatedUser.plan,
      status: updatedUser.status
    } : u));
  };

  const handleCreditUpdate = (userId: string, newBalance: number) => {
    // Update user credits in the list
    setUsers(users.map(u => u.id === userId ? {
      ...u,
      credits_remaining: newBalance
    } : u));
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

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'starter':
        return 'bg-blue-100 text-blue-800';
      case 'basic':
        return 'bg-green-100 text-green-800';
      case 'pro':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <Ban className="w-3 h-3 mr-1" />
        Suspended
      </span>
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
            <p className="mt-1 text-sm text-gray-500">
              Total users: {total}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative inline-block">
              <button 
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                className="btn btn-secondary"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
              {exportDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setExportDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                    <div className="py-1">
                      <button
                        onClick={() => handleExport('all', 'csv')}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Export All (CSV)
                      </button>
                      <button
                        onClick={() => handleExport('all', 'json')}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Export All (JSON)
                      </button>
                      {selectedUserIds.size > 0 && (
                        <>
                          <div className="border-t border-gray-100"></div>
                          <button
                            onClick={() => handleExport('selected', 'csv')}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Export Selected ({selectedUserIds.size}) (CSV)
                          </button>
                          <button
                            onClick={() => handleExport('selected', 'json')}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Export Selected ({selectedUserIds.size}) (JSON)
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={params.search || ''}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={params.status}
              onChange={(e) => handleStatusFilter(e.target.value as AdminUserListParams['status'])}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedUserIds.size > 0 && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-900">
                {selectedUserIds.size} user{selectedUserIds.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={deselectAllUsers}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear selection
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleBulkAction('activate')}
                disabled={bulkActionLoading}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserCheck className="w-4 h-4 mr-1" />
                Activate
              </button>
              <button
                onClick={() => handleBulkAction('suspend')}
                disabled={bulkActionLoading}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserX className="w-4 h-4 mr-1" />
                Suspend
              </button>
              <button
                onClick={() => {
                  setEmailModalOpen(true);
                }}
                disabled={bulkActionLoading}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail className="w-4 h-4 mr-1" />
                Email
              </button>
              <button
                onClick={() => setBulkCreditModalOpen(true)}
                disabled={bulkActionLoading}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CreditCard className="w-4 h-4 mr-1" />
                Add Credits
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                disabled={bulkActionLoading}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </button>
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
                  onClick={() => selectedUserIds.size === users.length ? deselectAllUsers() : selectAllUsers()}
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
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plan
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('credits_remaining')}
              >
                Credits
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
              users.map((user) => (
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
                        <div className="h-10 w-10 rounded-full bg-primary-blue flex items-center justify-center">
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
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlanBadgeColor(user.plan)}`}>
                      {user.plan}
                    </span>
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
                        onClick={() => setDropdownUserId(dropdownUserId === user.id ? null : user.id)}
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
                              <button
                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
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
              Showing <span className="font-medium">{(params.page! - 1) * params.limit! + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(params.page! * params.limit!, total)}
              </span>{' '}
              of <span className="font-medium">{total}</span> results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(params.page! - 1)}
                disabled={params.page === 1}
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1;
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= params.page! - 1 && page <= params.page! + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 text-sm font-medium rounded-md ${
                        page === params.page
                          ? 'bg-primary-blue text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (page === params.page! - 2 || page === params.page! + 2) {
                  return <span key={page} className="px-1">...</span>;
                }
                return null;
              })}
              <button
                onClick={() => handlePageChange(params.page! + 1)}
                disabled={params.page === totalPages}
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
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
          onUpdate={(newBalance) => handleCreditUpdate(selectedUser.id, newBalance)}
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
        selectedUsers={users.filter(u => selectedUserIds.has(u.id)).map(u => ({
          id: u.id,
          email: u.email,
          first_name: u.full_name?.split(' ')[0],
          last_name: u.full_name?.split(' ').slice(1).join(' ')
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