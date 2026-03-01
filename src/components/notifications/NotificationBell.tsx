'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, ExternalLink, Check } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'announcement';
  action_url?: string;
  action_text?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  is_read?: boolean;
  is_dismissed?: boolean;
}

export function NotificationBell() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async (isPolling = false) => {
    try {
      if (!isPolling) setLoading(true);
      const supabase = createClientSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const response = await fetch('/api/notifications', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, []);

  // Initial fetch + poll every 30 seconds for new notifications
  useEffect(() => {
    if (user) {
      fetchNotifications();
      intervalRef.current = setInterval(() => fetchNotifications(true), 30000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      const supabase = createClientSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          notificationId,
          action: 'read',
        }),
      });

      // Update local state
      setNotifications(
        notifications.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    try {
      const supabase = createClientSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          notificationId,
          action: 'dismiss',
        }),
      });

      // Remove from local state
      setNotifications(notifications.filter(n => n.id !== notificationId));
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.is_read) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'announcement':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const visibleNotifications = notifications.filter(n => !n.is_dismissed);

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          {/* Click outside to close */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />

          {/* Notification Panel */}
          <div className="absolute right-0 mt-2 w-96 max-h-[500px] bg-white rounded-lg shadow-xl border border-gray-200 z-20 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Notifications
                </h3>
                <button
                  onClick={() => setShowDropdown(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-[400px]">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  Loading notifications...
                </div>
              ) : visibleNotifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No notifications
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {visibleNotifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`
                        p-4 hover:bg-gray-50 transition-colors
                        ${!notification.is_read ? 'bg-blue-50/30' : ''}
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4
                                className={`
                                font-medium text-gray-900
                                ${notification.priority === 'urgent' ? 'flex items-center gap-1' : ''}
                              `}
                              >
                                {notification.priority === 'urgent' && (
                                  <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                )}
                                {notification.title}
                              </h4>
                              <p className="mt-1 text-sm text-gray-600">
                                {notification.message}
                              </p>
                              {notification.action_url &&
                                notification.action_text && (
                                  <a
                                    href={notification.action_url}
                                    {...(notification.action_url.startsWith('/')
                                      ? {}
                                      : { target: '_blank', rel: 'noopener noreferrer' })}
                                    onClick={() => {
                                      if (!notification.is_read) markAsRead(notification.id);
                                      setShowDropdown(false);
                                    }}
                                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-700"
                                  >
                                    {notification.action_text}
                                    {!notification.action_url.startsWith('/') && (
                                      <ExternalLink className="h-3 w-3" />
                                    )}
                                  </a>
                                )}
                              <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                                <span>
                                  {formatDistanceToNow(
                                    new Date(notification.created_at),
                                    { addSuffix: true }
                                  )}
                                </span>
                                <span
                                  className={`
                                  inline-flex px-2 py-0.5 rounded-full text-xs font-medium
                                  ${getNotificationColor(notification.type)}
                                `}
                                >
                                  {notification.type}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {!notification.is_read && (
                                <button
                                  onClick={() => markAsRead(notification.id)}
                                  className="p-1 text-gray-400 hover:text-gray-600"
                                  title="Mark as read"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  dismissNotification(notification.id)
                                }
                                className="p-1 text-gray-400 hover:text-gray-600"
                                title="Dismiss"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
