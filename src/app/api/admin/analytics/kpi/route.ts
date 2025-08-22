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

    // Get time range from query params
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '30d';
    
    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    
    switch (range) {
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default: // 30d
        startDate.setDate(now.getDate() - 30);
    }

    // Use service role client for data access
    const serviceClient = createServiceRoleSupabaseClient();
    
    // Fetch all necessary data for KPIs
    // Note: These are simplified calculations. In production, you'd want more sophisticated queries

    // Get total users and new users
    const { data: allUsers } = await serviceClient
      .from('profiles')
      .select('id, created_at, subscription_plan, subscription_status');

    const { data: newUsers } = await serviceClient
      .from('profiles')
      .select('id')
      .gte('created_at', startDate.toISOString());

    // Get active users (logged in within time range)
    const { data: activeUsers } = await serviceClient
      .from('profiles')
      .select('id')
      .gte('last_sign_in_at', startDate.toISOString());

    // Get subscription data
    const { data: subscriptions } = await serviceClient
      .from('profiles')
      .select('subscription_plan, subscription_status')
      .not('subscription_plan', 'eq', 'free')
      .eq('subscription_status', 'active');

    // Get churned users (had subscription but cancelled)
    const { data: churnedUsers } = await serviceClient
      .from('profiles')
      .select('id, subscription_plan')
      .eq('subscription_status', 'cancelled')
      .gte('updated_at', startDate.toISOString());

    // Get revenue data (simplified - in production you'd use Stripe data)
    const { data: transactions } = await serviceClient
      .from('credit_transactions')
      .select('amount, type, created_at')
      .eq('type', 'purchase')
      .gte('created_at', startDate.toISOString());

    // Calculate KPIs
    const totalUsers = allUsers?.length || 0;
    const paidUsers = subscriptions?.length || 0;
    const newUserCount = newUsers?.length || 0;
    const activeUserCount = activeUsers?.length || 0;
    const churnedCount = churnedUsers?.length || 0;

    // Conversion rate (free to paid)
    const conversionRate = totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0;
    
    // Churn rate
    const churnRate = paidUsers > 0 ? (churnedCount / paidUsers) * 100 : 0;
    
    // ARPU (Average Revenue Per User)
    const totalRevenue = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    const arpu = paidUsers > 0 ? totalRevenue / paidUsers : 0;

    // User growth rate
    const previousPeriodUsers = totalUsers - newUserCount;
    const userGrowthRate = previousPeriodUsers > 0 
      ? ((newUserCount / previousPeriodUsers) * 100) 
      : 0;

    // Simplified retention cohorts (in production, track actual user behavior)
    const retention = {
      day1: 85, // Mock data - in production, calculate from actual user activity
      day7: 65,
      day30: 45,
      day90: 35
    };

    // Build response
    const kpiData = {
      conversion: {
        rate: conversionRate,
        trend: 5.2, // Mock trend data
        freeToBasic: 8.5,
        freeToStarter: 3.2,
        trialConversion: 0
      },
      churn: {
        rate: churnRate,
        trend: -2.1,
        monthlyChurn: churnRate,
        yearlyChurn: churnRate * 12,
        byPlan: {
          basic: 5.2,
          starter: 3.1
        }
      },
      financial: {
        arpu: arpu / 100, // Convert cents to dollars
        arpuTrend: 3.5,
        ltv: (arpu / 100) * 12, // Simplified LTV calculation
        cac: 15, // Mock CAC
        ltvCacRatio: arpu > 0 ? ((arpu / 100) * 12) / 15 : 0,
        paybackPeriod: arpu > 0 ? 15 / (arpu / 100) : 0
      },
      growth: {
        userGrowthRate,
        mauGrowth: 12.5, // Mock MAU growth
        newUsersThisMonth: newUserCount,
        referralRate: 15.3 // Mock referral rate
      },
      retention
    };

    return NextResponse.json(kpiData);

  } catch (error) {
    console.error('Error fetching KPI data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPI data' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'admin');