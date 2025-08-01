import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { AdminDashboardStats } from '@/types/admin';

export async function GET() {
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use service role client to bypass RLS for stats
    const serviceClient = createServiceRoleClient();

    // Get current date ranges
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // User statistics
    const { count: totalUsers } = await serviceClient
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: activeToday } = await serviceClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_sign_in_at', todayStart.toISOString());

    const { count: activeWeek } = await serviceClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_sign_in_at', weekStart.toISOString());

    const { count: newToday } = await serviceClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString());

    const { count: newWeek } = await serviceClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekStart.toISOString());

    // Revenue statistics (from Stripe transactions)
    // For now, we'll calculate from user plans
    const { data: paidUsers } = await serviceClient
      .from('profiles')
      .select('subscription_plan')
      .in('subscription_plan', ['basic', 'starter', 'pro']);

    const planPrices: Record<string, number> = {
      basic: 9.99,
      starter: 24.99,
      pro: 49.99
    };

    const mrr = paidUsers?.reduce((total, user) => {
      return total + (planPrices[user.subscription_plan] || 0);
    }, 0) || 0;

    const arr = mrr * 12;

    // Get recent transactions for daily/weekly/monthly revenue
    const { data: todayTransactions } = await serviceClient
      .from('credit_transactions')
      .select('amount')
      .gte('created_at', todayStart.toISOString())
      .like('description', '%Purchase%');

    const todayRevenue = todayTransactions?.reduce((sum, t) => 
      t.amount > 0 ? sum + (t.amount * 0.5) : sum, 0 // Rough estimate: $0.50 per credit
    ) || 0;

    const { data: weekTransactions } = await serviceClient
      .from('credit_transactions')
      .select('amount')
      .gte('created_at', weekStart.toISOString())
      .like('description', '%Purchase%');

    const weekRevenue = weekTransactions?.reduce((sum, t) => 
      t.amount > 0 ? sum + (t.amount * 0.5) : sum, 0
    ) || 0;

    const { data: monthTransactions } = await serviceClient
      .from('credit_transactions')
      .select('amount')
      .gte('created_at', monthStart.toISOString())
      .like('description', '%Purchase%');

    const monthRevenue = monthTransactions?.reduce((sum, t) => 
      t.amount > 0 ? sum + (t.amount * 0.5) : sum, 0
    ) || 0;

    // Processing statistics
    let imagesToday = 0;
    let imagesWeek = 0; 
    let processingStats: any[] = [];
    
    try {
      const { count: todayCount } = await serviceClient
        .from('api_usage_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString());
      imagesToday = todayCount || 0;

      const { count: weekCount } = await serviceClient
        .from('api_usage_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekStart.toISOString());
      imagesWeek = weekCount || 0;

      const { data: stats } = await serviceClient
        .from('api_usage_logs')
        .select('processing_status, processing_time_ms')
        .gte('created_at', weekStart.toISOString());
      processingStats = stats || [];
    } catch (error) {
      // api_usage_logs table might not exist yet
      console.log('api_usage_logs table not found, using defaults');
    }

    const successCount = processingStats?.filter(p => p.processing_status === 'success').length || 0;
    const totalCount = processingStats?.length || 1;
    const successRate = (successCount / totalCount) * 100;

    const avgProcessingTime = processingStats?.length 
      ? processingStats.reduce((sum, p) => sum + (p.processing_time_ms || 0), 0) / processingStats.length / 1000
      : 0;

    // Support statistics (placeholder for now)
    const supportStats = {
      open_tickets: 0,
      avg_response_time: 0,
      satisfaction_score: 0
    };

    console.log('[Admin Dashboard Stats] User counts:', {
      totalUsers,
      activeToday,
      activeWeek,
      newToday,
      newWeek
    });

    const stats: AdminDashboardStats = {
      users: {
        total: totalUsers || 0,
        active_today: activeToday || 0,
        active_week: activeWeek || 0,
        new_today: newToday || 0,
        new_week: newWeek || 0
      },
      revenue: {
        mrr,
        arr,
        today: todayRevenue,
        week: weekRevenue,
        month: monthRevenue
      },
      processing: {
        images_today: imagesToday,
        images_week: imagesWeek,
        success_rate: parseFloat(successRate.toFixed(1)),
        avg_processing_time: parseFloat(avgProcessingTime.toFixed(1))
      },
      support: supportStats
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}