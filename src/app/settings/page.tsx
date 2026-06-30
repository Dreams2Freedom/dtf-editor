'use client';

import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ClientOnly } from '@/components/auth/ClientOnly';
import { LoadingPage } from '@/components/ui/LoadingPage';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { CancellationFlow } from '@/components/subscription/CancellationFlow';
import { toast } from '@/lib/toast';
import {
  formatPhoneNumber,
  cleanPhoneNumber,
  displayPhoneNumber,
} from '@/utils/phoneFormatter';
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Bell,
  CreditCard,
  Shield,
  Save,
  AlertCircle,
  Download,
} from 'lucide-react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { CreditHistory } from '@/components/dashboard/CreditHistory';

export default function SettingsPage() {
  const { user, profile, loading, initialize, refreshProfile } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Deep-link to a specific tab via ?tab= (e.g. /settings?tab=billing).
  // Read from the URL directly to avoid a useSearchParams Suspense boundary.
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    const validTabs = [
      'profile',
      'account',
      'password',
      'notifications',
      'billing',
      'security',
    ];
    if (tab && validTabs.includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <LoadingPage message="Loading settings..." />;
  }

  if (!user) {
    return null;
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'account', label: 'Account', icon: Mail },
    { id: 'password', label: 'Password', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'billing', label: 'Billing & Membership', icon: CreditCard },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <ClientOnly fallback={<LoadingPage message="Loading settings..." />}>
      <div className="min-h-screen bg-gray-50">
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Breadcrumb items={[{ label: 'Settings' }]} />
          </div>

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Manage your account preferences</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <nav className="space-y-1">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-primary-500 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Content Area */}
            <div className="lg:col-span-3">
              {activeTab === 'profile' && <ProfileSettings />}
              {activeTab === 'account' && <AccountSettings />}
              {activeTab === 'password' && <PasswordSettings />}
              {activeTab === 'notifications' && <NotificationSettings />}
              {activeTab === 'billing' && <BillingSettings />}
              {activeTab === 'security' && <SecuritySettings />}
            </div>
          </div>
        </main>
      </div>
    </ClientOnly>
  );
}

// Profile Settings Component
function ProfileSettings() {
  const { profile, updateProfile, refreshProfile } = useAuthStore();
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    company_name: profile?.company_name || '',
    phone: profile?.phone || '',
  });
  const [loading, setLoading] = useState(false);

  // Update form when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        company_name: profile.company_name || '',
        phone: displayPhoneNumber(profile.phone) || '',
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          phone: cleanPhoneNumber(formData.phone), // Store clean number in database
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      // Refresh the profile from the server to ensure state is synced
      await refreshProfile();
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>
          Update your personal information and profile details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              Company Name
            </label>
            <Input
              type="text"
              value={formData.company_name}
              onChange={e =>
                setFormData({ ...formData, company_name: e.target.value })
              }
              placeholder="Acme Corp"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={e => {
                const formatted = formatPhoneNumber(e.target.value);
                setFormData({ ...formData, phone: formatted });
              }}
              placeholder="(555) 123-4567"
              maxLength={14} // "(xxx) xxx-xxxx"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Account Settings Component
function AccountSettings() {
  const { user } = useAuthStore();
  const [emailData, setEmailData] = useState({
    current_email: user?.email || '',
    new_email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/user/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        throw new Error('Failed to update email');
      }

      toast.success(
        'Email update initiated. Please check your new email for verification.'
      );
      setEmailData({ ...emailData, new_email: '', password: '' });
    } catch (error) {
      toast.error('Failed to update email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Settings</CardTitle>
        <CardDescription>
          Manage your email address and account preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEmailChange} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Email
            </label>
            <Input
              type="email"
              value={emailData.current_email}
              disabled
              className="bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Email
            </label>
            <Input
              type="email"
              value={emailData.new_email}
              onChange={e =>
                setEmailData({ ...emailData, new_email: e.target.value })
              }
              placeholder="newemail@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <Input
              type="password"
              value={emailData.password}
              onChange={e =>
                setEmailData({ ...emailData, password: e.target.value })
              }
              placeholder="Enter your current password"
              required
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-amber-700">
                <p className="font-medium">Important:</p>
                <p>
                  Changing your email will require verification. You'll need to
                  confirm the change via email sent to your new address.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={loading || !emailData.new_email || !emailData.password}
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Updating...' : 'Update Email'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Password Settings Component
function PasswordSettings() {
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validatePassword = () => {
    const newErrors: Record<string, string> = {};

    if (passwordData.new_password.length < 8) {
      newErrors.new_password = 'Password must be at least 8 characters';
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update password');
      }

      toast.success('Password updated successfully');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (error) {
      toast.error(
        'Failed to update password. Please check your current password.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>
          Update your password to keep your account secure
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePasswordChange} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <Input
              type="password"
              value={passwordData.current_password}
              onChange={e =>
                setPasswordData({
                  ...passwordData,
                  current_password: e.target.value,
                })
              }
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <Input
              type="password"
              value={passwordData.new_password}
              onChange={e =>
                setPasswordData({
                  ...passwordData,
                  new_password: e.target.value,
                })
              }
              required
              error={errors.new_password}
            />
            <p className="mt-1 text-sm text-gray-500">
              Must be at least 8 characters long
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <Input
              type="password"
              value={passwordData.confirm_password}
              onChange={e =>
                setPasswordData({
                  ...passwordData,
                  confirm_password: e.target.value,
                })
              }
              required
              error={errors.confirm_password}
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={
                loading ||
                !passwordData.current_password ||
                !passwordData.new_password ||
                !passwordData.confirm_password
              }
            >
              <Lock className="w-4 h-4 mr-2" />
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Notification Settings Component
function NotificationSettings() {
  const { profile } = useAuthStore();
  const [preferences, setPreferences] = useState({
    email_marketing: false,
    email_updates: true,
    email_tips: true,
    credit_alerts: true,
    subscription_reminders: true,
  });
  const [loading, setLoading] = useState(false);

  const handleSavePreferences = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/user/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      toast.success('Notification preferences updated');
    } catch (error) {
      toast.error('Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Choose what notifications you want to receive
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Product Updates</p>
                <p className="text-sm text-gray-500">
                  Get notified about new features and improvements
                </p>
              </div>
              <Checkbox
                checked={preferences.email_updates}
                onCheckedChange={checked =>
                  setPreferences({
                    ...preferences,
                    email_updates: checked as boolean,
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Tips & Tutorials</p>
                <p className="text-sm text-gray-500">
                  Helpful tips to get the most out of DTF Editor
                </p>
              </div>
              <Checkbox
                checked={preferences.email_tips}
                onCheckedChange={checked =>
                  setPreferences({
                    ...preferences,
                    email_tips: checked as boolean,
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Credit Alerts</p>
                <p className="text-sm text-gray-500">
                  Notifications when credits are low or expiring
                </p>
              </div>
              <Checkbox
                checked={preferences.credit_alerts}
                onCheckedChange={checked =>
                  setPreferences({
                    ...preferences,
                    credit_alerts: checked as boolean,
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  Subscription Reminders
                </p>
                <p className="text-sm text-gray-500">
                  Billing and renewal notifications
                </p>
              </div>
              <Checkbox
                checked={preferences.subscription_reminders}
                onCheckedChange={checked =>
                  setPreferences({
                    ...preferences,
                    subscription_reminders: checked as boolean,
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Marketing Emails</p>
                <p className="text-sm text-gray-500">
                  Special offers and promotions
                </p>
              </div>
              <Checkbox
                checked={preferences.email_marketing}
                onCheckedChange={checked =>
                  setPreferences({
                    ...preferences,
                    email_marketing: checked as boolean,
                  })
                }
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSavePreferences} disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Billing & Membership Component
const PLAN_CREDITS: Record<string, string> = {
  free: '2 credits per month',
  basic: '20 credits per month',
  starter: '60 credits per month',
  professional: '150 credits per month',
};

function BillingSettings() {
  const { user, profile } = useAuthStore();
  const router = useRouter();

  const plan = profile?.subscription_plan || 'free';
  const isPaid = plan !== 'free';
  const planCredits = PLAN_CREDITS[plan] || '';
  const [showCancellationFlow, setShowCancellationFlow] = useState(false);

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          returnUrl: window.location.origin + '/settings?tab=billing',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Billing portal error:', error);
      toast.error(error.message || 'Unable to access billing portal');
    }
  };

  return (
    <div className="space-y-6">
      {/* Billing & Membership */}
      <Card>
        <CardHeader>
          <CardTitle>Billing & Membership</CardTitle>
          <CardDescription>
            Manage your plan, update billing, buy credits, or cancel your
            membership.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Current plan</p>
                <p className="text-lg font-medium capitalize">{plan}</p>
                {planCredits && (
                  <p className="text-sm text-gray-500">{planCredits}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">Billing status</p>
                <p className="font-medium capitalize">
                  {profile?.subscription_status || (isPaid ? 'Active' : 'Free')}
                </p>
              </div>
            </div>

            {profile?.subscription_status === 'trialing' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Your trial ends on{' '}
                {(profile as any).subscription_current_period_end
                  ? new Date(
                      (profile as any).subscription_current_period_end
                    ).toLocaleDateString()
                  : 'soon'}
                . Billing begins after your trial unless canceled.
              </div>
            )}

            <div className="space-y-3">
              {isPaid ? (
                <>
                  <Button
                    onClick={handleManageSubscription}
                    className="w-full justify-start"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Manage Membership
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => router.push('/pricing')}
                    className="w-full justify-start"
                  >
                    Change Plan
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => router.push('/pricing?tab=payasyougo')}
                    className="w-full justify-start"
                  >
                    Buy Credits
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowCancellationFlow(true)}
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Cancel Membership
                  </Button>
                  <p className="px-1 text-xs text-gray-500">
                    Manage billing details and payment methods through the secure
                    billing portal.
                  </p>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => router.push('/pricing')}
                    className="w-full justify-start"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Choose a Plan
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => router.push('/pricing?tab=payasyougo')}
                    className="w-full justify-start"
                  >
                    Buy Credits
                  </Button>
                  <p className="px-1 text-xs text-gray-500">
                    You&apos;re on the Free plan. Upgrade anytime — you can change
                    or cancel later through the secure billing portal.
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credits & Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Credits & Usage</CardTitle>
          <CardDescription>
            Your available credits and how to get more.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500">Available credits</p>
              <p className="text-3xl font-bold text-blue-600">
                {profile?.credits_remaining ?? 0}
              </p>
              {planCredits && (
                <p className="text-sm text-gray-500">
                  {planCredits} included with your plan
                </p>
              )}
            </div>
            <Button onClick={() => router.push('/pricing?tab=payasyougo')}>
              <CreditCard className="w-4 h-4 mr-2" />
              Buy Credits
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Credit History (moved from the dashboard home) */}
      <Card>
        <CardHeader>
          <CardTitle>Credit History</CardTitle>
          <CardDescription>
            Your credit purchases, usage, and refunds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreditHistory />
        </CardContent>
      </Card>

      {/* In-app retention/cancellation flow (instead of the Stripe portal) */}
      {profile && isPaid && (
        <CancellationFlow
          isOpen={showCancellationFlow}
          onClose={() => setShowCancellationFlow(false)}
          onComplete={() => {
            setShowCancellationFlow(false);
            window.location.reload();
          }}
          subscription={{
            plan: profile.subscription_plan || 'basic',
            nextBillingDate:
              (profile as any).subscription_current_period_end ||
              new Date().toISOString(),
          }}
        />
      )}
    </div>
  );
}

// Security Settings Component
function SecuritySettings() {
  const { user } = useAuthStore();
  const [exporting, setExporting] = useState(false);

  const handleExportData = async () => {
    if (!user?.id) return;

    setExporting(true);
    try {
      const response = await fetch(`/api/users/${user.id}/export`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const fileNameMatch = contentDisposition?.match(/filename="(.+)"/);
      const fileName = fileNameMatch ? fileNameMatch[1] : 'my-data-export.json';

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

      toast.success('Your data has been exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export your data');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
        <CardDescription>
          Manage your account security and privacy
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Account ID
            </h3>
            <p className="font-mono text-sm text-gray-600 bg-gray-50 p-3 rounded">
              {user?.id}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Last Sign In
            </h3>
            <p className="text-gray-600">
              {user?.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleString()
                : 'Never'}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">Two-Factor Authentication</p>
                <p>
                  Two-factor authentication is not yet available but will be
                  added soon for enhanced security.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Data & Privacy
            </h3>
            <div className="space-y-3">
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={handleExportData}
                disabled={exporting}
              >
                <Download className="w-4 h-4 mr-2" />
                {exporting ? 'Exporting...' : 'Download My Data (GDPR)'}
              </Button>
              <p className="text-xs text-gray-500 px-1">
                Export all your personal data including profile information,
                images, transactions, and usage history.
              </p>
              <Button
                variant="secondary"
                className="w-full justify-start text-red-600 hover:text-red-700"
                disabled
              >
                Delete My Account (Contact Support)
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
