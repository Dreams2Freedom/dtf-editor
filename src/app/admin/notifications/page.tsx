'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { toast } from '@/lib/toast';
import { Bell, Send, Users, DollarSign, Gift, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { createClientSupabaseClient } from '@/lib/supabase/client';

type NotificationType = 'info' | 'warning' | 'success' | 'error' | 'announcement';
type TargetAudience = 'all' | 'free' | 'basic' | 'starter' | 'custom';
type Priority = 'low' | 'normal' | 'high' | 'urgent';

export default function AdminNotificationsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info' as NotificationType,
    targetAudience: 'all' as TargetAudience,
    actionUrl: '',
    actionText: '',
    priority: 'normal' as Priority,
    expiresIn: '', // hours
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.message) {
      toast.error('Title and message are required');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClientSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Authentication required');
        return;
      }
      
      // Calculate expiration if set
      let expiresAt = null;
      if (formData.expiresIn) {
        const hours = parseInt(formData.expiresIn);
        expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      }

      const response = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...formData,
          expiresAt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send notification');
      }

      toast.success(`Notification sent to ${data.usersNotified} users`);
      
      // Reset form
      setFormData({
        title: '',
        message: '',
        type: 'info',
        targetAudience: 'all',
        actionUrl: '',
        actionText: '',
        priority: 'normal',
        expiresIn: '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  const getAudienceIcon = (audience: TargetAudience) => {
    switch (audience) {
      case 'all':
        return <Users className="h-4 w-4" />;
      case 'free':
        return <Gift className="h-4 w-4" />;
      case 'basic':
      case 'starter':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getAudienceLabel = (audience: TargetAudience) => {
    switch (audience) {
      case 'all':
        return 'All Users';
      case 'free':
        return 'Free Users Only';
      case 'basic':
        return 'Basic Plan Users';
      case 'starter':
        return 'Starter Plan Users';
      case 'custom':
        return 'Custom Selection';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="h-7 w-7" />
              Send Notification
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Send targeted notifications to your users
            </p>
          </div>
        </div>

        {/* Notification Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create Notification</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Notification title"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message *
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Notification message"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={4}
                  required
                />
              </div>

              {/* Type and Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as NotificationType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                    <option value="announcement">Announcement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Target Audience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Audience
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(['all', 'free', 'basic', 'starter'] as TargetAudience[]).map((audience) => (
                    <button
                      key={audience}
                      type="button"
                      onClick={() => setFormData({ ...formData, targetAudience: audience })}
                      className={`
                        flex items-center justify-center gap-2 px-4 py-2 rounded-md border transition-colors
                        ${formData.targetAudience === audience
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-300 hover:border-gray-400'
                        }
                      `}
                    >
                      {getAudienceIcon(audience)}
                      <span className="text-sm font-medium">{getAudienceLabel(audience)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action URL and Text (Optional) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Action URL (Optional)
                  </label>
                  <Input
                    value={formData.actionUrl}
                    onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Action Button Text (Optional)
                  </label>
                  <Input
                    value={formData.actionText}
                    onChange={(e) => setFormData({ ...formData, actionText: e.target.value })}
                    placeholder="Learn More"
                  />
                </div>
              </div>

              {/* Expiration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expires In (Hours) - Leave empty for no expiration
                </label>
                <Input
                  type="number"
                  value={formData.expiresIn}
                  onChange={(e) => setFormData({ ...formData, expiresIn: e.target.value })}
                  placeholder="24"
                  min="1"
                />
              </div>

              {/* Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
                <div className={`
                  p-4 rounded-md border
                  ${formData.type === 'info' && 'bg-blue-50 border-blue-200'}
                  ${formData.type === 'success' && 'bg-green-50 border-green-200'}
                  ${formData.type === 'warning' && 'bg-yellow-50 border-yellow-200'}
                  ${formData.type === 'error' && 'bg-red-50 border-red-200'}
                  ${formData.type === 'announcement' && 'bg-purple-50 border-purple-200'}
                `}>
                  <div className="flex items-start gap-3">
                    <AlertCircle className={`
                      h-5 w-5 flex-shrink-0 mt-0.5
                      ${formData.type === 'info' && 'text-blue-600'}
                      ${formData.type === 'success' && 'text-green-600'}
                      ${formData.type === 'warning' && 'text-yellow-600'}
                      ${formData.type === 'error' && 'text-red-600'}
                      ${formData.type === 'announcement' && 'text-purple-600'}
                    `} />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {formData.title || 'Notification Title'}
                      </h4>
                      <p className="mt-1 text-sm text-gray-600">
                        {formData.message || 'Notification message will appear here...'}
                      </p>
                      {formData.actionUrl && formData.actionText && (
                        <button className="mt-2 text-sm font-medium text-purple-600 hover:text-purple-700">
                          {formData.actionText}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={loading}
                  className="min-w-[150px]"
                >
                  {loading ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Notification
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}