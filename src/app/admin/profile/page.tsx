'use client';

import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/lib/toast';
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  Calendar,
  Save,
  Key,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminProfilePage() {
  const { user, profile, loading, initialize } = useAuthStore();
  const router = useRouter();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!loading && (!user || !profile?.is_admin)) {
      router.push('/admin/login');
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Admin Profile
                </h1>
                <p className="text-gray-600">Manage your admin account</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Your admin account details and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email Address
                  </label>
                  <p className="text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Shield className="w-4 h-4 inline mr-1" />
                    Admin Role
                  </label>
                  <Badge variant="default">Administrator</Badge>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Member Since
                  </label>
                  <p className="text-gray-900">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Key className="w-4 h-4 inline mr-1" />
                    Account ID
                  </label>
                  <p className="font-mono text-sm text-gray-600">
                    {user.id.slice(0, 8)}...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <Input
                      type="text"
                      value={formData.first_name}
                      onChange={e =>
                        setFormData({ ...formData, first_name: e.target.value })
                      }
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <Input
                      type="text"
                      value={formData.last_name}
                      onChange={e =>
                        setFormData({ ...formData, last_name: e.target.value })
                      }
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={e =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving}>
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Security Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>
                Manage your account security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/settings?tab=password">
                <Button variant="outline" className="w-full justify-start">
                  <Key className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled
              >
                <Shield className="w-4 h-4 mr-2" />
                Two-Factor Authentication (Coming Soon)
              </Button>
            </CardContent>
          </Card>

          {/* Admin Permissions */}
          <Card>
            <CardHeader>
              <CardTitle>Admin Permissions</CardTitle>
              <CardDescription>
                Your administrative capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">User Management</span>
                  <Badge variant="success">Full Access</Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">Financial Management</span>
                  <Badge variant="success">Full Access</Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">Analytics & Reports</span>
                  <Badge variant="success">Full Access</Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">System Settings</span>
                  <Badge variant="success">Full Access</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
