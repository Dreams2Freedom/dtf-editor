import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Use service role client for data access
    const serviceClient = createServiceRoleSupabaseClient();

    // Get all users with their activity data
    const { data: users, error } = await serviceClient
      .from('profiles')
      .select('id, email, first_name, last_name, last_activity_at, created_at, subscription_plan')
      .order('last_activity_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error fetching user activity:', error);
      throw error;
    }

    // Calculate activity metrics
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const activeUsers = users?.filter(u => u.last_activity_at) || [];

    const metrics = {
      activeLastHour: activeUsers.filter(u => new Date(u.last_activity_at) >= oneHourAgo).length,
      activeToday: activeUsers.filter(u => new Date(u.last_activity_at) >= oneDayAgo).length,
      activeThisWeek: activeUsers.filter(u => new Date(u.last_activity_at) >= oneWeekAgo).length,
      activeThisMonth: activeUsers.filter(u => new Date(u.last_activity_at) >= oneMonthAgo).length,
      totalUsers: users?.length || 0,
      neverActive: users?.filter(u => !u.last_activity_at).length || 0
    };

    // Format user activity data
    const userActivity = users?.map(user => {
      const lastActivity = user.last_activity_at ? new Date(user.last_activity_at) : null;
      const timeSinceActivity = lastActivity ? now.getTime() - lastActivity.getTime() : null;

      let activityStatus = 'inactive';
      if (timeSinceActivity !== null) {
        if (timeSinceActivity < 60 * 60 * 1000) activityStatus = 'active'; // Last hour
        else if (timeSinceActivity < 24 * 60 * 60 * 1000) activityStatus = 'today'; // Today
        else if (timeSinceActivity < 7 * 24 * 60 * 60 * 1000) activityStatus = 'recent'; // This week
      }

      return {
        id: user.id,
        email: user.email,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown',
        lastActivity: user.last_activity_at,
        lastActivityFormatted: lastActivity ? formatTimeAgo(lastActivity) : 'Never',
        status: activityStatus,
        plan: user.subscription_plan || 'free',
        joinedAt: user.created_at
      };
    }) || [];

    return NextResponse.json({
      metrics,
      users: userActivity
    });

  } catch (error) {
    console.error('Error in user activity API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user activity' },
      { status: 500 }
    );
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;

  return date.toLocaleDateString();
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'admin');