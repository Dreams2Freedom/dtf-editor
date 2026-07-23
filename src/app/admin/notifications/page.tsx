'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { toast } from '@/lib/toast';
import {
  Bell,
  Send,
  Users,
  DollarSign,
  Gift,
  AlertCircle,
  Trash2,
  Sparkles,
  Plus,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { APP_VERSION } from '@/config/patchNotes';

type AdminTab = 'send' | 'manage' | 'patch';

interface ManagedNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  target_audience: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

type NotificationType =
  | 'info'
  | 'warning'
  | 'success'
  | 'error'
  | 'announcement';
type TargetAudience = 'all' | 'free' | 'basic' | 'starter' | 'custom';
type Priority = 'low' | 'normal' | 'high' | 'urgent';

export default function AdminNotificationsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<AdminTab>('send');
  const [managed, setManaged] = useState<ManagedNotification[]>([]);
  const [managedLoading, setManagedLoading] = useState(false);
  const [publishedVersion, setPublishedVersion] = useState<string | null>(null);
  const [patchLoading, setPatchLoading] = useState(false);
  const [patchSaving, setPatchSaving] = useState(false);
  // Editable patch-note content (date + bullet lines) for the current build.
  const [patchDate, setPatchDate] = useState('');
  const [patchItems, setPatchItems] = useState<string[]>([]);

  const fetchPatchStatus = useCallback(async () => {
    setPatchLoading(true);
    try {
      const res = await fetch('/api/admin/patch-notes', {
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setPublishedVersion(data.publishedVersion ?? null);
        setPatchDate(data.date ?? '');
        setPatchItems(
          Array.isArray(data.items) && data.items.length > 0
            ? data.items
            : ['']
        );
      }
    } catch {
      /* ignore */
    } finally {
      setPatchLoading(false);
    }
  }, []);

  const setPatchPublish = useCallback(
    async (publish: boolean) => {
      const items = patchItems.map(s => s.trim()).filter(Boolean);
      if (publish && items.length === 0) {
        toast.error('Add at least one patch-note line before publishing.');
        return;
      }
      setPatchSaving(true);
      try {
        const res = await fetch('/api/admin/patch-notes', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version: APP_VERSION,
            date: patchDate,
            items,
            publish,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Update failed');
        setPublishedVersion(data.publishedVersion ?? null);
        toast.success(
          publish
            ? `Patch notes v${APP_VERSION} are now live for users`
            : 'Draft saved — hidden from users'
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Update failed');
      } finally {
        setPatchSaving(false);
      }
    },
    [patchDate, patchItems]
  );

  const fetchManaged = useCallback(async () => {
    setManagedLoading(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) setManaged(data.notifications || []);
      else toast.error(data.error || 'Failed to load announcements');
    } catch {
      toast.error('Failed to load announcements');
    } finally {
      setManagedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'manage') fetchManaged();
    if (tab === 'patch') fetchPatchStatus();
  }, [tab, fetchManaged, fetchPatchStatus]);

  const deleteAnnouncement = async (id: string) => {
    if (!confirm('Delete this announcement for everyone? This cannot be undone.'))
      return;
    try {
      const res = await fetch(`/api/admin/notifications?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setManaged(m => m.filter(n => n.id !== id));
      toast.success('Announcement deleted');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  };

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
      const {
        data: { session },
      } = await supabase.auth.getSession();

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
          Authorization: `Bearer ${session.access_token}`,
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
              Notifications
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Send and manage app-wide announcements, and preview patch notes.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {(
            [
              ['send', 'Send'],
              ['manage', 'Manage'],
              ['patch', 'Patch Notes'],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setTab(val)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === val
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Notification Form */}
        {tab === 'send' && (
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
                  onChange={e =>
                    setFormData({ ...formData, title: e.target.value })
                  }
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
                  onChange={e =>
                    setFormData({ ...formData, message: e.target.value })
                  }
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
                    onChange={e =>
                      setFormData({
                        ...formData,
                        type: e.target.value as NotificationType,
                      })
                    }
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
                    onChange={e =>
                      setFormData({
                        ...formData,
                        priority: e.target.value as Priority,
                      })
                    }
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
                  {(
                    ['all', 'free', 'basic', 'starter'] as TargetAudience[]
                  ).map(audience => (
                    <button
                      key={audience}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, targetAudience: audience })
                      }
                      className={`
                        flex items-center justify-center gap-2 px-4 py-2 rounded-md border transition-colors
                        ${
                          formData.targetAudience === audience
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-300 hover:border-gray-400'
                        }
                      `}
                    >
                      {getAudienceIcon(audience)}
                      <span className="text-sm font-medium">
                        {getAudienceLabel(audience)}
                      </span>
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
                    onChange={e =>
                      setFormData({ ...formData, actionUrl: e.target.value })
                    }
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Action Button Text (Optional)
                  </label>
                  <Input
                    value={formData.actionText}
                    onChange={e =>
                      setFormData({ ...formData, actionText: e.target.value })
                    }
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
                  onChange={e =>
                    setFormData({ ...formData, expiresIn: e.target.value })
                  }
                  placeholder="24"
                  min="1"
                />
              </div>

              {/* Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Preview
                </h3>
                <div
                  className={`
                  p-4 rounded-md border
                  ${formData.type === 'info' && 'bg-blue-50 border-blue-200'}
                  ${formData.type === 'success' && 'bg-success-50 border-green-200'}
                  ${formData.type === 'warning' && 'bg-warning-50 border-warning-200'}
                  ${formData.type === 'error' && 'bg-error-50 border-error-200'}
                  ${formData.type === 'announcement' && 'bg-purple-50 border-purple-200'}
                `}
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      className={`
                      h-5 w-5 flex-shrink-0 mt-0.5
                      ${formData.type === 'info' && 'text-blue-600'}
                      ${formData.type === 'success' && 'text-success-600'}
                      ${formData.type === 'warning' && 'text-warning-600'}
                      ${formData.type === 'error' && 'text-error-600'}
                      ${formData.type === 'announcement' && 'text-purple-600'}
                    `}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {formData.title || 'Notification Title'}
                      </h4>
                      <p className="mt-1 text-sm text-gray-600">
                        {formData.message ||
                          'Notification message will appear here...'}
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
        )}

        {/* Manage tab — list + delete existing announcements */}
        {tab === 'manage' && (
          <Card>
            <CardHeader>
              <CardTitle>Live Announcements</CardTitle>
            </CardHeader>
            <CardContent>
              {managedLoading ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : managed.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No announcements yet. Send one from the Send tab.
                </p>
              ) : (
                <div className="space-y-2">
                  {managed.map(n => {
                    const expired =
                      n.expires_at && new Date(n.expires_at) <= new Date();
                    const live = n.is_active && !expired;
                    return (
                      <div
                        key={n.id}
                        className="flex items-start justify-between gap-3 border border-gray-200 rounded-lg p-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {n.title}
                            </p>
                            <span
                              className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                                live
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {live ? 'Live' : expired ? 'Expired' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-1">
                            {n.target_audience} ·{' '}
                            {new Date(n.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteAnnouncement(n.id)}
                          className="flex-shrink-0 flex items-center gap-1 text-xs text-red-600 hover:text-red-800 border border-red-200 hover:border-red-300 rounded-lg px-2.5 py-1.5 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Patch Notes tab — admin-only preview of what users will see */}
        {tab === 'patch' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                Patch Notes Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500 mb-4">
                Edit the wording of the &quot;What&apos;s new&quot; pop-up below,
                then publish it. Keep it plain-language and user-relevant — no
                code or internal detail. Nothing reaches users until you publish.
              </p>

              {/* Status + publish controls */}
              {(() => {
                const isLive = publishedVersion === APP_VERSION;
                return (
                  <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            Current build: v{APP_VERSION}
                          </span>
                          <span
                            className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                              isLive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {patchLoading
                              ? 'Checking…'
                              : isLive
                                ? 'Live for users'
                                : 'Not published'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {isLive
                            ? 'Live — users see this pop-up once each. Edit and re-publish to update it.'
                            : publishedVersion
                              ? `Users are currently being shown v${publishedVersion}. Publish to switch them to this build.`
                              : 'Not shown to users yet. Edit the notes, then publish.'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={patchSaving || patchLoading}
                          onClick={() => setPatchPublish(false)}
                        >
                          {isLive ? 'Unpublish' : 'Save draft'}
                        </Button>
                        <Button
                          type="button"
                          disabled={patchSaving || patchLoading}
                          onClick={() => setPatchPublish(true)}
                        >
                          {patchSaving
                            ? 'Saving…'
                            : isLive
                              ? 'Update live notes'
                              : 'Publish to users'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Editor */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Date label
                  </label>
                  <Input
                    value={patchDate}
                    onChange={e => setPatchDate(e.target.value)}
                    placeholder="e.g. July 2026"
                    className="max-w-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    What&apos;s new — one line per bullet
                  </label>
                  <div className="space-y-2">
                    {patchItems.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="mt-3 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                        <textarea
                          value={item}
                          onChange={e =>
                            setPatchItems(items =>
                              items.map((v, idx) =>
                                idx === i ? e.target.value : v
                              )
                            )
                          }
                          rows={2}
                          placeholder="Describe a change in plain language…"
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setPatchItems(items =>
                              items.length > 1
                                ? items.filter((_, idx) => idx !== i)
                                : ['']
                            )
                          }
                          className="mt-1.5 p-1.5 text-gray-400 hover:text-red-600 rounded"
                          aria-label="Remove line"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPatchItems(items => [...items, ''])}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add line
                  </button>
                </div>

                {/* Live preview of the user pop-up */}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Preview
                  </p>
                  <div className="mx-auto max-w-sm rounded-xl border border-gray-200 p-5 shadow-sm">
                    <div className="text-center">
                      <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                        <Sparkles className="w-6 h-6 text-blue-600" />
                      </div>
                      <h2 className="text-lg font-bold text-gray-900">
                        What&apos;s new
                      </h2>
                      <p className="text-xs text-gray-400 mb-4">
                        {patchDate || 'Date'}
                      </p>
                    </div>
                    <ul className="space-y-2.5 text-left">
                      {patchItems
                        .filter(s => s.trim())
                        .map((item, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed"
                          >
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      {patchItems.filter(s => s.trim()).length === 0 && (
                        <li className="text-sm text-gray-400 italic">
                          Add a line to see it here…
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
