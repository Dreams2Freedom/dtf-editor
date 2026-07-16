import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { withRateLimit } from '@/lib/rate-limit';

/**
 * Per-user notifications read/write.
 *
 * Previously the GET read from `user_notifications_view`, whose per-user
 * read/dismiss state depends on `auth.uid()` — which is NULL under the
 * service-role client, so every user got the same "all"-audience rows with
 * read/dismiss reported as NULL (the stale-legacy-message bug). Here we resolve
 * audience + per-user state explicitly from the user id instead, and PATCH
 * upserts the junction row so read/dismiss always take effect even when the
 * fan-out never created a row for this user.
 */

function serviceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getUserFromRequest(request: NextRequest, supabase: SupabaseClient) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

interface NotificationRow {
  id: string;
  target_audience: string;
  target_user_ids: string[] | null;
  expires_at: string | null;
  [key: string]: unknown;
}

/**
 * Active, non-expired notifications that apply to this user's audience, merged
 * with the user's own read/dismiss state (default false when no row exists),
 * with dismissed ones removed. Newest first.
 */
async function fetchActiveForUser(supabase: SupabaseClient, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_plan')
    .eq('id', userId)
    .single();
  const plan = (profile?.subscription_plan as string | null) ?? 'free';

  const { data: rows, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(40);
  if (error || !rows) return [];

  const now = Date.now();
  const applies = (rows as NotificationRow[]).filter(n => {
    if (n.expires_at && new Date(n.expires_at).getTime() <= now) return false;
    switch (n.target_audience) {
      case 'all':
        return true;
      case 'custom':
        return Array.isArray(n.target_user_ids) && n.target_user_ids.includes(userId);
      case 'free':
        return plan === 'free';
      case 'basic':
        return plan === 'basic';
      case 'starter':
        return plan === 'starter';
      default:
        return false;
    }
  });

  const ids = applies.map(n => n.id);
  const stateMap = new Map<string, { is_read: boolean; is_dismissed: boolean }>();
  if (ids.length > 0) {
    const { data: uns } = await supabase
      .from('user_notifications')
      .select('notification_id, is_read, is_dismissed')
      .eq('user_id', userId)
      .in('notification_id', ids);
    (uns ?? []).forEach(u =>
      stateMap.set(u.notification_id as string, {
        is_read: !!u.is_read,
        is_dismissed: !!u.is_dismissed,
      })
    );
  }

  return applies
    .map(n => {
      const st = stateMap.get(n.id);
      return { ...n, is_read: st?.is_read ?? false, is_dismissed: st?.is_dismissed ?? false };
    })
    .filter(n => !n.is_dismissed);
}

async function handleGet(request: NextRequest) {
  try {
    const supabase = serviceClient();
    const user = await getUserFromRequest(request, supabase);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const notifications = await fetchActiveForUser(supabase, user.id);
    const unreadCount = notifications.filter(n => !n.is_read).length;
    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in get notifications:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function handlePatch(request: NextRequest) {
  try {
    const supabase = serviceClient();
    const user = await getUserFromRequest(request, supabase);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { notificationId, action } = body as {
      notificationId?: string;
      action?: string;
    };
    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    if (action === 'read-all') {
      const active = await fetchActiveForUser(supabase, user.id);
      const unread = active.filter(n => !n.is_read);
      if (unread.length > 0) {
        await supabase.from('user_notifications').upsert(
          unread.map(n => ({
            notification_id: n.id,
            user_id: user.id,
            is_read: true,
            read_at: nowIso,
          })),
          { onConflict: 'notification_id,user_id' }
        );
      }
      return NextResponse.json({ success: true });
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    // Upsert the junction row directly so the action always takes effect, even
    // if the audience fan-out never created a row for this user.
    if (action === 'read') {
      await supabase.from('user_notifications').upsert(
        {
          notification_id: notificationId,
          user_id: user.id,
          is_read: true,
          read_at: nowIso,
        },
        { onConflict: 'notification_id,user_id' }
      );
    } else if (action === 'dismiss') {
      await supabase.from('user_notifications').upsert(
        {
          notification_id: notificationId,
          user_id: user.id,
          is_read: true,
          read_at: nowIso,
          is_dismissed: true,
          dismissed_at: nowIso,
        },
        { onConflict: 'notification_id,user_id' }
      );
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const GET = withRateLimit(handleGet, 'api');
export const PATCH = withRateLimit(handlePatch, 'api');
