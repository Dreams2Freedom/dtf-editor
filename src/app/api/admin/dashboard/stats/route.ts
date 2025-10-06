import { NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import type { AdminDashboardStats } from '@/types/admin';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet() {
  try {
    const supabase = await createServerSupabaseClient();

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use service role client to bypass RLS for stats
    const serviceClient = createServiceRoleClient();

    // Get current date ranges
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const monthStart = new Date(now);
    monthStart.setMonth(now.getMonth() - 1);

    // ========================================
    // USER STATISTICS - FIXED
    // ========================================

    // Total users
    const { count: totalUsers } = await serviceClient
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Active users - Check last_activity_at field which actually exists
    const { count: activeToday } = await serviceClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_activity_at', todayStart.toISOString());

    const { count: activeWeek } = await serviceClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_activity_at', weekStart.toISOString());

    // New users
    const { count: newToday } = await serviceClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString());

    const { count: newWeek } = await serviceClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekStart.toISOString());

    // ========================================
    // REVENUE STATISTICS - PROPERLY CALCULATED
    // ========================================

    // Get users with paid subscription plans (checking plan field since status might not be set correctly)
    const paidPlans = ['basic', 'starter', 'professional', 'pro'];
    const { data: activeSubscriptions } = await serviceClient
      .from('profiles')
      .select('subscription_plan, subscription_status, stripe_subscription_id')
      .or(
        `subscription_plan.in.(${paidPlans.join(',')}),subscription_status.in.(active,trialing)`
      );

    // Real plan prices (in dollars, not cents)
    const planPrices: Record<string, number> = {
      basic: 9.99,
      starter: 24.99,
      professional: 49.99,
      pro: 49.99,
    };

    // Calculate MRR from users with paid plans
    const mrr =
      activeSubscriptions?.reduce((total, sub) => {
        // Only count users with actual paid plans
        if (paidPlans.includes(sub.subscription_plan)) {
          return total + (planPrices[sub.subscription_plan] || 0);
        }
        return total;
      }, 0) || 0;

    const arr = mrr * 12;

    // Get revenue from credit transactions (purchases and subscriptions)
    // Look for actual purchase transactions
    const { data: todayTransactions } = await serviceClient
      .from('credit_transactions')
      .select('amount, metadata, type')
      .gte('created_at', todayStart.toISOString())
      .in('type', ['purchase', 'subscription']);

    // Calculate today's revenue from metadata which should contain price info
    const todayRevenue =
      todayTransactions?.reduce((sum, t) => {
        // Check metadata for actual price paid (price_paid is in cents)
        const price = t.metadata?.price_paid || t.metadata?.amount_paid || 0;
        return sum + price / 100; // Convert from cents to dollars
      }, 0) || 0;

    const { data: weekTransactions } = await serviceClient
      .from('credit_transactions')
      .select('amount, metadata, type')
      .gte('created_at', weekStart.toISOString())
      .in('type', ['purchase', 'subscription']);

    const weekRevenue =
      weekTransactions?.reduce((sum, t) => {
        const price = t.metadata?.price_paid || t.metadata?.amount_paid || 0;
        return sum + price / 100;
      }, 0) || 0;

    const { data: monthTransactions } = await serviceClient
      .from('credit_transactions')
      .select('amount, metadata, type')
      .gte('created_at', monthStart.toISOString())
      .in('type', ['purchase', 'subscription']);

    const monthRevenue =
      monthTransactions?.reduce((sum, t) => {
        const price = t.metadata?.price_paid || t.metadata?.amount_paid || 0;
        return sum + price / 100;
      }, 0) || 0;

    // ========================================
    // PROCESSING STATISTICS
    // ========================================

    let imagesToday = 0;
    let imagesWeek = 0;
    let processingStats: any[] = [];

    try {
      // Count actual image operations or credit usage for today
      const { count: todayUsage } = await serviceClient
        .from('credit_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'usage')
        .gte('created_at', todayStart.toISOString());
      imagesToday = todayUsage || 0;

      const { count: weekUsage } = await serviceClient
        .from('credit_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'usage')
        .gte('created_at', weekStart.toISOString());
      imagesWeek = weekUsage || 0;

      // Try to get processing stats from api_usage_logs if it exists
      const { data: stats } = await serviceClient
        .from('api_usage_logs')
        .select('processing_status, processing_time_ms')
        .gte('created_at', weekStart.toISOString())
        .limit(100);

      if (stats) {
        processingStats = stats;
      }
    } catch (error) {
      console.log('Some stats tables not found, using defaults');
    }

    const successCount =
      processingStats?.filter(p => p.processing_status === 'success').length ||
      0;
    const totalCount = processingStats?.length || 1;
    const successRate =
      totalCount > 0 ? (successCount / totalCount) * 100 : 100;

    const avgProcessingTime = processingStats?.length
      ? processingStats.reduce(
          (sum, p) => sum + (p.processing_time_ms || 0),
          0
        ) /
        processingStats.length /
        1000
      : 0;

    // Support statistics (placeholder for now)
    const supportStats = {
      open_tickets: 0,
      avg_response_time: 0,
      satisfaction_score: 0,
    };

    console.log('[Admin Dashboard Stats] Fixed stats:', {
      users: {
        totalUsers,
        activeToday,
        activeWeek,
        newToday,
        newWeek,
      },
      revenue: {
        mrr,
        arr,
        todayRevenue,
        weekRevenue,
        monthRevenue,
        activeSubscriptions: activeSubscriptions?.length || 0,
      },
    });

    const stats: AdminDashboardStats = {
      users: {
        total: totalUsers || 0,
        active_today: activeToday || 0,
        active_week: activeWeek || 0,
        new_today: newToday || 0,
        new_week: newWeek || 0,
      },
      revenue: {
        mrr,
        arr,
        today: todayRevenue,
        week: weekRevenue,
        month: monthRevenue,
      },
      processing: {
        images_today: imagesToday,
        images_week: imagesWeek,
        success_rate: parseFloat(successRate.toFixed(1)),
        avg_processing_time: parseFloat(avgProcessingTime.toFixed(1)),
      },
      support: supportStats,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'admin');
