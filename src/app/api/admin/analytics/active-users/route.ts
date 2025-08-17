import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
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

    // Get time range from query params
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '7d';
    
    // Calculate date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today);
    thisWeek.setDate(today.getDate() - 7);
    const thisMonth = new Date(today);
    thisMonth.setDate(today.getDate() - 30);
    
    // Fetch active users data
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, last_sign_in_at, created_at');

    // Calculate active users
    const activeNow = allProfiles?.filter(p => {
      if (!p.last_sign_in_at) return false;
      const lastActive = new Date(p.last_sign_in_at);
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      return lastActive >= fiveMinutesAgo;
    }).length || 0;

    const activeToday = allProfiles?.filter(p => {
      if (!p.last_sign_in_at) return false;
      const lastActive = new Date(p.last_sign_in_at);
      return lastActive >= today;
    }).length || 0;

    const activeThisWeek = allProfiles?.filter(p => {
      if (!p.last_sign_in_at) return false;
      const lastActive = new Date(p.last_sign_in_at);
      return lastActive >= thisWeek;
    }).length || 0;

    const activeThisMonth = allProfiles?.filter(p => {
      if (!p.last_sign_in_at) return false;
      const lastActive = new Date(p.last_sign_in_at);
      return lastActive >= thisMonth;
    }).length || 0;

    // Calculate daily active users for the past 7 days
    const dailyActive = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      
      const count = allProfiles?.filter(p => {
        if (!p.last_sign_in_at) return false;
        const lastActive = new Date(p.last_sign_in_at);
        return lastActive >= date && lastActive < nextDate;
      }).length || 0;

      dailyActive.push({
        date: date.toISOString().split('T')[0],
        count
      });
    }

    // Mock hourly distribution (in production, you'd track this properly)
    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: Math.floor(Math.random() * 50) + 10 // Mock data
    }));

    // Mock device types (in production, track user agents)
    const totalActive = activeThisMonth;
    const deviceTypes = [
      { type: 'desktop', count: Math.floor(totalActive * 0.65), percentage: 65 },
      { type: 'mobile', count: Math.floor(totalActive * 0.30), percentage: 30 },
      { type: 'tablet', count: Math.floor(totalActive * 0.05), percentage: 5 }
    ];

    // Calculate engagement metrics (simplified)
    const returningUsers = allProfiles?.filter(p => {
      if (!p.created_at || !p.last_sign_in_at) return false;
      const created = new Date(p.created_at);
      const lastActive = new Date(p.last_sign_in_at);
      const daysSinceCreation = (lastActive.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreation > 1;
    }).length || 0;

    const engagement = {
      avgSessionDuration: 345, // 5m 45s (mock)
      avgPageViews: 4.2, // Mock
      bounceRate: 35.5, // Mock
      returningUsers: totalActive > 0 ? Math.round((returningUsers / totalActive) * 100) : 0
    };

    // Mock geographic data (in production, track IP locations)
    const geographic = [
      { country: 'United States', count: Math.floor(totalActive * 0.40), percentage: 40 },
      { country: 'United Kingdom', count: Math.floor(totalActive * 0.15), percentage: 15 },
      { country: 'Canada', count: Math.floor(totalActive * 0.10), percentage: 10 },
      { country: 'Australia', count: Math.floor(totalActive * 0.08), percentage: 8 },
      { country: 'Germany', count: Math.floor(totalActive * 0.05), percentage: 5 },
      { country: 'Other', count: Math.floor(totalActive * 0.22), percentage: 22 }
    ];

    const activeUserData = {
      current: {
        activeNow,
        activeToday,
        activeThisWeek,
        activeThisMonth
      },
      trends: {
        dailyActive,
        hourlyDistribution,
        deviceTypes
      },
      engagement,
      geographic
    };

    return NextResponse.json(activeUserData);

  } catch (error) {
    console.error('Error fetching active user data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active user data' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'admin');