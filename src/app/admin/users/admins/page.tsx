'use client';

import { useState, useEffect } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import { Shield, UserPlus, Edit, Trash2, Check, X } from 'lucide-react';

interface AdminUser {
  id: string;
  user_id: string;
  role: string;
  permissions: Record<string, boolean>;
  is_active: boolean;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

interface RolePreset {
  role_name: string;
  display_name: string;
  description: string;
  default_permissions: Record<string, boolean>;
}

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [rolePresets, setRolePresets] = useState<RolePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('admin');
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const supabase = createClientSupabaseClient();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // Check current user's role
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Not authenticated');
        return;
      }

      // Get current user's admin role
      const { data: roleData } = await supabase
        .rpc('get_admin_role', { user_id: user.id });

      setCurrentUserRole(roleData);

      if (roleData !== 'super_admin') {
        toast.error('Only super admins can manage admins');
        return;
      }

      // Fetch all admins
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (adminError) throw adminError;

      // Fetch user details for each admin
      const adminsWithDetails = await Promise.all(
        (adminData || []).map(async (admin) => {
          const { data: authUser } = await supabase.auth.admin.getUserById(admin.user_id);
          return {
            ...admin,
            user_email: authUser?.user?.email,
            user_name: authUser?.user?.user_metadata?.full_name
          };
        })
      );

      setAdmins(adminsWithDetails);

      // Fetch role presets
      const { data: presets, error: presetsError } = await supabase
        .from('admin_role_presets')
        .select('*')
        .order('role_name');

      if (presetsError) throw presetsError;
      setRolePresets(presets || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }

  async function createAdmin() {
    if (!newAdminEmail.trim()) {
      toast.error('Please enter an email');
      return;
    }

    try {
      // Find user by email
      const { data: users } = await supabase.auth.admin.listUsers();
      const targetUser = users?.users?.find(u => u.email === newAdminEmail);

      if (!targetUser) {
        toast.error('User not found');
        return;
      }

      // Get role preset
      const preset = rolePresets.find(p => p.role_name === selectedRole);
      if (!preset) {
        toast.error('Invalid role selected');
        return;
      }

      // Create admin user
      const { error } = await supabase
        .from('admin_users')
        .insert({
          user_id: targetUser.id,
          role: selectedRole,
          permissions: preset.default_permissions,
          is_active: true
        });

      if (error) throw error;

      toast.success('Admin created successfully');
      setShowAddModal(false);
      setNewAdminEmail('');
      fetchData();

    } catch (error: any) {
      console.error('Error creating admin:', error);
      toast.error(error.message || 'Failed to create admin');
    }
  }

  async function toggleAdminStatus(adminId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !currentStatus })
        .eq('id', adminId);

      if (error) throw error;

      toast.success(`Admin ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchData();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Failed to update admin status');
    }
  }

  async function deleteAdmin(adminId: string) {
    if (!confirm('Are you sure you want to delete this admin?')) return;

    try {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', adminId);

      if (error) throw error;

      toast.success('Admin deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting admin:', error);
      toast.error('Failed to delete admin');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (currentUserRole !== 'super_admin') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 text-error-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-600">Only super administrators can manage admin users.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Admin Management
          </h1>
          <p className="text-gray-600 mt-1">Manage administrator access and permissions</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Admin
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Total Admins</p>
            <p className="text-2xl font-bold">{admins.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Active</p>
            <p className="text-2xl font-bold text-success-600">
              {admins.filter(a => a.is_active).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Super Admins</p>
            <p className="text-2xl font-bold text-blue-600">
              {admins.filter(a => a.role === 'super_admin').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Regular Admins</p>
            <p className="text-2xl font-bold">
              {admins.filter(a => a.role !== 'super_admin').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Admins Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Administrators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {admins.map((admin) => (
                  <tr key={admin.id}>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium">{admin.user_email}</div>
                        {admin.user_name && (
                          <div className="text-xs text-gray-500">{admin.user_name}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        admin.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                        admin.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {admin.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        admin.is_active ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
                      }`}>
                        {admin.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(admin.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleAdminStatus(admin.id, admin.is_active)}
                          className="text-blue-600 hover:text-blue-800"
                          title={admin.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {admin.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        </button>
                        {admin.role !== 'super_admin' && (
                          <button
                            onClick={() => deleteAdmin(admin.id)}
                            className="text-error-600 hover:text-error-800"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Add New Admin</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">User Email</label>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {rolePresets.map((preset) => (
                    <option key={preset.role_name} value={preset.role_name}>
                      {preset.display_name}
                    </option>
                  ))}
                </select>
                {rolePresets.find(p => p.role_name === selectedRole)?.description && (
                  <p className="text-xs text-gray-500 mt-1">
                    {rolePresets.find(p => p.role_name === selectedRole)?.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={createAdmin} className="flex-1">
                Create Admin
              </Button>
              <Button
                onClick={() => {
                  setShowAddModal(false);
                  setNewAdminEmail('');
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
