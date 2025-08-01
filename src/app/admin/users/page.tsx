'use client';

import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { UserListTable } from '@/components/admin/users/UserListTable';
import { UserStatsCards } from '@/components/admin/users/UserStatsCards';
import { Users } from 'lucide-react';

export default function AdminUsersPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-7 w-7" />
              User Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage user accounts, credits, and subscriptions
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <UserStatsCards />

        {/* User List Table */}
        <UserListTable />
      </div>
    </AdminLayout>
  );
}