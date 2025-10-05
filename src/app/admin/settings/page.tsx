'use client';

import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { toast } from '@/lib/toast';
import {
  ArrowLeft,
  Bell,
  Shield,
  Database,
  Mail,
  DollarSign,
  Users,
  AlertCircle,
  Check,
  X,
  Calculator
} from 'lucide-react';
import Link from 'next/link';
import ApiCostConfig from '@/components/admin/settings/ApiCostConfig';

export default function AdminSettingsPage() {
  const { user, profile, loading, initialize } = useAuthStore();
  const router = useRouter();
  const [settings, setSettings] = useState({
    // Notification settings
    new_user_alerts: true,
    payment_alerts: true,
    error_alerts: true,
    daily_summary: false,
    
    // Security settings
    require_2fa: false,
    session_timeout: 60, // minutes
    ip_whitelist: false,
    
    // System settings
    maintenance_mode: false,
    debug_mode: false,
    api_rate_limit: 100,
    
    // Email settings
    support_email: 'support@dtfeditor.com',
    from_email: 'noreply@dtfeditor.com',
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

  const handleSaveSettings = async () => {
    setIsSaving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success('Settings saved successfully');
    setIsSaving(false);
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
                <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
                <p className="text-gray-600">Configure system-wide settings</p>
              </div>
            </div>
            <Button onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save All Settings'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure admin notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">New User Alerts</p>
                  <p className="text-sm text-gray-500">Get notified when new users sign up</p>
                </div>
                <Checkbox
                  checked={settings.new_user_alerts}
                  onCheckedChange={(checked) => setSettings({ ...settings, new_user_alerts: checked as boolean })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Payment Alerts</p>
                  <p className="text-sm text-gray-500">Notifications for payments and subscriptions</p>
                </div>
                <Checkbox
                  checked={settings.payment_alerts}
                  onCheckedChange={(checked) => setSettings({ ...settings, payment_alerts: checked as boolean })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Error Alerts</p>
                  <p className="text-sm text-gray-500">Critical system errors and failures</p>
                </div>
                <Checkbox
                  checked={settings.error_alerts}
                  onCheckedChange={(checked) => setSettings({ ...settings, error_alerts: checked as boolean })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Daily Summary</p>
                  <p className="text-sm text-gray-500">Receive daily activity summary</p>
                </div>
                <Checkbox
                  checked={settings.daily_summary}
                  onCheckedChange={(checked) => setSettings({ ...settings, daily_summary: checked as boolean })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Configure security and access controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Require 2FA for Admins</p>
                  <p className="text-sm text-gray-500">Enforce two-factor authentication</p>
                </div>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <div>
                <Input
                  type="number"
                  label="Session Timeout (minutes)"
                  value={settings.session_timeout}
                  onChange={(e) => setSettings({ ...settings, session_timeout: parseInt(e.target.value) })}
                  min="15"
                  max="480"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">IP Whitelist</p>
                  <p className="text-sm text-gray-500">Restrict admin access by IP</p>
                </div>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2" />
                System Settings
              </CardTitle>
              <CardDescription>
                Core system configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Maintenance Mode</p>
                  <p className="text-sm text-gray-500">Show maintenance page to users</p>
                </div>
                <div className="flex items-center">
                  {settings.maintenance_mode ? (
                    <Badge variant="warning">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                  <div className="ml-3">
                    <Checkbox
                      checked={settings.maintenance_mode}
                      onCheckedChange={(checked) => setSettings({ ...settings, maintenance_mode: checked as boolean })}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Debug Mode</p>
                  <p className="text-sm text-gray-500">Enable detailed error logging</p>
                </div>
                <Checkbox
                  checked={settings.debug_mode}
                  onCheckedChange={(checked) => setSettings({ ...settings, debug_mode: checked as boolean })}
                />
              </div>
              <div>
                <Input
                  type="number"
                  label="API Rate Limit (requests/minute)"
                  value={settings.api_rate_limit}
                  onChange={(e) => setSettings({ ...settings, api_rate_limit: parseInt(e.target.value) })}
                  min="10"
                  max="1000"
                />
              </div>
            </CardContent>
          </Card>

          {/* Email Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="w-5 h-5 mr-2" />
                Email Configuration
              </CardTitle>
              <CardDescription>
                Email system settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="email"
                label="Support Email Address"
                value={settings.support_email}
                onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
              />
              <Input
                type="email"
                label="From Email Address"
                value={settings.from_email}
                onChange={(e) => setSettings({ ...settings, from_email: e.target.value })}
              />
            </CardContent>
          </Card>
        </div>

        {/* API Cost Configuration */}
        <div className="mt-6">
          <ApiCostConfig />
        </div>

        {/* System Status */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Current system health and status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center justify-between p-3 bg-success-50 rounded-lg">
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-success-600 mr-2" />
                  <span className="font-medium">Database</span>
                </div>
                <Badge variant="success">Healthy</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-success-50 rounded-lg">
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-success-600 mr-2" />
                  <span className="font-medium">Storage</span>
                </div>
                <Badge variant="success">Healthy</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-success-50 rounded-lg">
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-success-600 mr-2" />
                  <span className="font-medium">APIs</span>
                </div>
                <Badge variant="success">Connected</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-warning-50 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-warning-600 mr-2" />
                  <span className="font-medium">Email</span>
                </div>
                <Badge variant="warning">Not Configured</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="mt-6 border-error-200">
          <CardHeader>
            <CardTitle className="text-error-600">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions - proceed with caution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="text-error-600 border-error-300 hover:bg-error-50" disabled>
              <Database className="w-4 h-4 mr-2" />
              Reset Database (Disabled)
            </Button>
            <Button variant="outline" className="text-error-600 border-error-300 hover:bg-error-50" disabled>
              <Users className="w-4 h-4 mr-2" />
              Clear All User Data (Disabled)
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}