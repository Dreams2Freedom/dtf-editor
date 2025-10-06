'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AuditLogViewer } from '@/components/admin/audit/AuditLogViewer';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/lib/toast';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export default function AdminAuditPage() {
  const router = useRouter();
  const { user, isAdmin, initialize } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      if (!user) {
        await initialize();
      }

      const state = useAuthStore.getState();

      if (!state.user) {
        toast.error('Please login to access admin audit logs');
        router.push('/admin/login');
        return;
      }

      if (!state.isAdmin) {
        toast.error('Access denied. Admin privileges required.');
        router.push('/dashboard');
        return;
      }
    };

    checkAuth();
  }, [router, initialize]);

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[{ label: 'Admin', href: '/admin' }, { label: 'Audit Logs' }]}
        />

        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600">
            Track all administrative actions and changes
          </p>
        </div>

        {/* Audit Log Viewer */}
        <AuditLogViewer />
      </div>
    </AdminLayout>
  );
}
