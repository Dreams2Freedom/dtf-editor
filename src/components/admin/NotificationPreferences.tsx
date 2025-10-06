'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Bell,
  BellOff,
  Clock,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationPreferences {
  notify_new_signups: boolean;
  notify_new_subscriptions: boolean;
  notify_cancellations: boolean;
  notify_refund_requests: boolean;
  notify_support_tickets: boolean;
  notify_high_value_purchases: boolean;
  notify_failed_payments: boolean;
  daily_digest: boolean;
  weekly_digest: boolean;
  monthly_report: boolean;
  min_purchase_value_for_notification: number;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}

export function NotificationPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    notify_new_signups: true,
    notify_new_subscriptions: true,
    notify_cancellations: true,
    notify_refund_requests: true,
    notify_support_tickets: true,
    notify_high_value_purchases: true,
    notify_failed_payments: true,
    daily_digest: false,
    weekly_digest: true,
    monthly_report: true,
    min_purchase_value_for_notification: 20,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    timezone: 'America/New_York',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>(
    'idle'
  );

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const token = await user?.getIdToken();
      const response = await fetch('/api/admin/notification-preferences', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    setSaveStatus('idle');

    try {
      const token = await user?.getIdToken();
      const response = await fetch('/api/admin/notification-preferences', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleInputChange = (
    key: keyof NotificationPreferences,
    value: string | number
  ) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Notification Preferences
            </h2>
            <p className="text-gray-600 mt-1">
              Control which notifications you receive and when
            </p>
          </div>
          <Bell className="h-8 w-8 text-blue-600" />
        </div>

        {/* Real-time Notifications */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Real-time Notifications
          </h3>
          <div className="space-y-3">
            <NotificationToggle
              label="New User Signups"
              description="Get notified when new users sign up"
              checked={preferences.notify_new_signups}
              onChange={() => handleToggle('notify_new_signups')}
            />
            <NotificationToggle
              label="New Subscriptions"
              description="Alert for new paid subscriptions"
              checked={preferences.notify_new_subscriptions}
              onChange={() => handleToggle('notify_new_subscriptions')}
            />
            <NotificationToggle
              label="Cancellations"
              description="Notify when users cancel subscriptions"
              checked={preferences.notify_cancellations}
              onChange={() => handleToggle('notify_cancellations')}
            />
            <NotificationToggle
              label="Refund Requests"
              description="Alert for refund requests"
              checked={preferences.notify_refund_requests}
              onChange={() => handleToggle('notify_refund_requests')}
            />
            <NotificationToggle
              label="Support Tickets"
              description="New support ticket notifications"
              checked={preferences.notify_support_tickets}
              onChange={() => handleToggle('notify_support_tickets')}
            />
            <NotificationToggle
              label="High Value Purchases"
              description="Notify for purchases above threshold"
              checked={preferences.notify_high_value_purchases}
              onChange={() => handleToggle('notify_high_value_purchases')}
            />
            <NotificationToggle
              label="Failed Payments"
              description="Alert when payments fail"
              checked={preferences.notify_failed_payments}
              onChange={() => handleToggle('notify_failed_payments')}
            />
          </div>
        </div>

        {/* Digest Emails */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Digest Emails
          </h3>
          <div className="space-y-3">
            <NotificationToggle
              label="Daily Digest"
              description="Summary of daily activity"
              checked={preferences.daily_digest}
              onChange={() => handleToggle('daily_digest')}
            />
            <NotificationToggle
              label="Weekly Digest"
              description="Weekly summary every Monday"
              checked={preferences.weekly_digest}
              onChange={() => handleToggle('weekly_digest')}
            />
            <NotificationToggle
              label="Monthly Report"
              description="Detailed monthly analytics"
              checked={preferences.monthly_report}
              onChange={() => handleToggle('monthly_report')}
            />
          </div>
        </div>

        {/* Settings */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Notification Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Purchase Value for Notification
              </label>
              <div className="flex items-center">
                <span className="text-gray-500 mr-2">$</span>
                <input
                  type="number"
                  value={preferences.min_purchase_value_for_notification}
                  onChange={e =>
                    handleInputChange(
                      'min_purchase_value_for_notification',
                      parseInt(e.target.value)
                    )
                  }
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Only notify for purchases above this amount
              </p>
            </div>
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Quiet Hours
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={preferences.quiet_hours_start}
                onChange={e =>
                  handleInputChange('quiet_hours_start', e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={preferences.quiet_hours_end}
                onChange={e =>
                  handleInputChange('quiet_hours_end', e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timezone
              </label>
              <select
                value={preferences.timezone}
                onChange={e => handleInputChange('timezone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Asia/Tokyo">Tokyo</option>
              </select>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Non-urgent notifications will be held during quiet hours
          </p>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex items-center">
            {saveStatus === 'success' && (
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">
                  Preferences saved successfully
                </span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center text-red-600">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">
                  Failed to save preferences
                </span>
              </div>
            )}
          </div>
          <Button
            onClick={savePreferences}
            disabled={saving}
            className="min-w-[120px]"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function NotificationToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex-1">
        <label
          className="font-medium text-gray-900 cursor-pointer"
          onClick={onChange}
        >
          {label}
        </label>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
