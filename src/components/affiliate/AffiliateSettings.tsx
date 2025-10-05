'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Save, DollarSign, User, Bell } from 'lucide-react';
import Link from 'next/link';
import type { Affiliate } from '@/types/affiliate';

interface AffiliateSettingsProps {
  affiliate: Affiliate;
}

export function AffiliateSettings({ affiliate }: AffiliateSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Payment Settings
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'check'>(
    affiliate.payment_method || 'paypal'
  );
  const [paypalEmail, setPaypalEmail] = useState(affiliate.paypal_email || '');
  const [checkPayableTo, setCheckPayableTo] = useState(affiliate.check_payable_to || '');
  const [mailingAddress, setMailingAddress] = useState(affiliate.mailing_address || '');

  // Profile Settings
  const [displayName, setDisplayName] = useState(affiliate.display_name || '');
  const [websiteUrl, setWebsiteUrl] = useState(affiliate.website_url || '');
  const [socialMedia, setSocialMedia] = useState(affiliate.social_media || {
    twitter: '',
    facebook: '',
    instagram: '',
    youtube: '',
    tiktok: ''
  });

  // Notification Settings
  const [emailNotifications, setEmailNotifications] = useState(
    affiliate.email_notifications ?? true
  );

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/affiliate/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method: paymentMethod,
          paypal_email: paymentMethod === 'paypal' ? paypalEmail : null,
          check_payable_to: paymentMethod === 'check' ? checkPayableTo : null,
          mailing_address: paymentMethod === 'check' ? mailingAddress : null,
          display_name: displayName,
          website_url: websiteUrl,
          social_media: socialMedia,
          email_notifications: emailNotifications
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update settings');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/affiliate">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Affiliate Settings</h1>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          Settings updated successfully!
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Payment Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <DollarSign className="w-5 h-5 text-gray-600" />
          <h2 className="text-xl font-semibold">Payment Information</h2>
        </div>

        <div className="space-y-4">
          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="paypal"
                  checked={paymentMethod === 'paypal'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'paypal')}
                  className="mr-2"
                />
                PayPal
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="check"
                  checked={paymentMethod === 'check'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'check')}
                  className="mr-2"
                />
                Check
              </label>
            </div>
          </div>

          {/* PayPal Email */}
          {paymentMethod === 'paypal' && (
            <div>
              <label htmlFor="paypal-email" className="block text-sm font-medium text-gray-700 mb-2">
                PayPal Email Address
              </label>
              <Input
                id="paypal-email"
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                placeholder="your-paypal@example.com"
              />
            </div>
          )}

          {/* Check Details */}
          {paymentMethod === 'check' && (
            <>
              <div>
                <label htmlFor="check-payable" className="block text-sm font-medium text-gray-700 mb-2">
                  Check Payable To
                </label>
                <Input
                  id="check-payable"
                  type="text"
                  value={checkPayableTo}
                  onChange={(e) => setCheckPayableTo(e.target.value)}
                  placeholder="Full name or business name"
                />
              </div>
              <div>
                <label htmlFor="mailing-address" className="block text-sm font-medium text-gray-700 mb-2">
                  Mailing Address
                </label>
                <textarea
                  id="mailing-address"
                  value={mailingAddress}
                  onChange={(e) => setMailingAddress(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Street Address&#10;City, State ZIP&#10;Country"
                />
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Profile Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <User className="w-5 h-5 text-gray-600" />
          <h2 className="text-xl font-semibold">Profile Settings</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="display-name" className="block text-sm font-medium text-gray-700 mb-2">
              Display Name
            </label>
            <Input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How you'd like to appear on the leaderboard"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave blank to appear as "Anonymous"
            </p>
          </div>

          <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
              Website URL
            </label>
            <Input
              id="website"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourwebsite.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Social Media Links
            </label>
            <div className="space-y-2">
              <Input
                type="text"
                value={socialMedia.twitter || ''}
                onChange={(e) => setSocialMedia({ ...socialMedia, twitter: e.target.value })}
                placeholder="Twitter/X username (e.g., @yourusername)"
              />
              <Input
                type="text"
                value={socialMedia.facebook || ''}
                onChange={(e) => setSocialMedia({ ...socialMedia, facebook: e.target.value })}
                placeholder="Facebook URL"
              />
              <Input
                type="text"
                value={socialMedia.instagram || ''}
                onChange={(e) => setSocialMedia({ ...socialMedia, instagram: e.target.value })}
                placeholder="Instagram username"
              />
              <Input
                type="text"
                value={socialMedia.youtube || ''}
                onChange={(e) => setSocialMedia({ ...socialMedia, youtube: e.target.value })}
                placeholder="YouTube channel URL"
              />
              <Input
                type="text"
                value={socialMedia.tiktok || ''}
                onChange={(e) => setSocialMedia({ ...socialMedia, tiktok: e.target.value })}
                placeholder="TikTok username"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Notification Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="w-5 h-5 text-gray-600" />
          <h2 className="text-xl font-semibold">Notification Preferences</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Email Notifications</p>
            <p className="text-sm text-gray-600">
              Receive updates about commissions, payouts, and program changes
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </Card>

      {/* Tax Form Note */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Tax Information:</strong> Your tax form has been submitted and is on file.
          If you need to update your tax information, please contact support.
        </p>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={loading}
          size="lg"
        >
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
