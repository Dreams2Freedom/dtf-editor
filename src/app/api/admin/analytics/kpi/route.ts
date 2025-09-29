import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
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
    const previousPeriodStart = new Date();
    const previousPeriodEnd = new Date();
    
    switch (range) {
      case '90d':
        startDate.setDate(now.getDate() - 90);
        previousPeriodStart.setDate(now.getDate() - 180);
        previousPeriodEnd.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        previousPeriodStart.setFullYear(now.getFullYear() - 2);
        previousPeriodEnd.setFullYear(now.getFullYear() - 1);
        break;
      default: // 30d
        startDate.setDate(now.getDate() - 30);
        previousPeriodStart.setDate(now.getDate() - 60);
        previousPeriodEnd.setDate(now.getDate() - 30);
    }

    // Use service role client for data access
    const serviceClient = createServiceRoleClient();
    
    // ===============================================
    // FETCH ALL NECESSARY DATA FOR KPIs
    // ===============================================
    
    // Get all users and their subscription data
    const { data: allUsers, error: usersError } = await serviceClient
      .from('profiles')
      .select('id, created_at, subscription_plan, subscription_status, last_activity_at, stripe_subscription_id, email');
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
    }

    const users = allUsers || [];
    const totalUsers = users.length;
    
    // Calculate users by period
    const currentPeriodNewUsers = users.filter(u => 
      new Date(u.created_at) >= startDate
    ).length;
    
    const previousPeriodNewUsers = users.filter(u => {
      const createdAt = new Date(u.created_at);
      return createdAt >= previousPeriodStart && createdAt < previousPeriodEnd;
    }).length;
    
    // Active users (based on last_activity_at)
    const activeUsersThisPeriod = users.filter(u => 
      u.last_activity_at && new Date(u.last_activity_at) >= startDate
    ).length;
    
    const activeUsersPreviousPeriod = users.filter(u => {
      if (!u.last_activity_at) return false;
      const activityDate = new Date(u.last_activity_at);
      return activityDate >= previousPeriodStart && activityDate < previousPeriodEnd;
    }).length;
    
    // Paid subscribers - check by plan, not status since status might not be properly set
    const paidPlans = ['basic', 'starter', 'professional', 'pro'];
    const currentSubscribers = users.filter(u =>
      paidPlans.includes(u.subscription_plan) ||
      u.subscription_status === 'active' ||
      u.subscription_status === 'trialing'
    );

    const basicSubscribers = users.filter(u => u.subscription_plan === 'basic').length;
    const starterSubscribers = users.filter(u => u.subscription_plan === 'starter').length;
    const proSubscribers = users.filter(u =>
      u.subscription_plan === 'professional' || u.subscription_plan === 'pro'
    ).length;

    // Free users - those without a paid plan
    const freeUsers = users.filter(u =>
      u.subscription_plan === 'free' || !u.subscription_plan ||
      (!paidPlans.includes(u.subscription_plan) && u.subscription_status !== 'active' && u.subscription_status !== 'trialing')
    ).length;
    
    // ===============================================
    // REVENUE CALCULATIONS
    // ===============================================
    
    // Get credit transactions for revenue
    const { data: transactions } = await serviceClient
      .from('credit_transactions')
      .select('amount, metadata, type, created_at, user_id')
      .in('type', ['purchase', 'subscription'])
      .gte('created_at', previousPeriodStart.toISOString());
    
    // Current period revenue
    const currentPeriodTransactions = transactions?.filter(t => 
      new Date(t.created_at) >= startDate
    ) || [];
    
    const previousPeriodTransactions = transactions?.filter(t => {
      const date = new Date(t.created_at);
      return date >= previousPeriodStart && date < previousPeriodEnd;
    }) || [];
    
    // Calculate actual revenue from metadata (price_paid is in cents)
    const currentRevenue = currentPeriodTransactions.reduce((sum, t) => {
      const price = t.metadata?.price_paid || t.metadata?.amount_paid || 0;
      return sum + (price / 100); // Convert to dollars
    }, 0);
    
    const previousRevenue = previousPeriodTransactions.reduce((sum, t) => {
      const price = t.metadata?.price_paid || t.metadata?.amount_paid || 0;
      return sum + (price / 100);
    }, 0);
    
    // Calculate MRR
    const planPrices: Record<string, number> = {
      basic: 9.99,
      starter: 24.99,
      professional: 49.99,
      pro: 49.99
    };
    
    const mrr = currentSubscribers.reduce((total, sub) => {
      return total + (planPrices[sub.subscription_plan] || 0);
    }, 0);
    
    // ARPU (Average Revenue Per User)
    const paidUsers = currentSubscribers.length;
    const arpu = paidUsers > 0 ? mrr / paidUsers : 0;
    
    // ===============================================
    // CHURN CALCULATIONS
    // ===============================================
    
    // Get cancelled subscriptions in current period
    const { data: cancellations } = await serviceClient
      .from('subscription_events')
      .select('user_id, event_type, created_at, event_data')
      .eq('event_type', 'subscription_cancelled')
      .gte('created_at', startDate.toISOString());
    
    const churnedCount = cancellations?.length || 0;
    const churnRate = paidUsers > 0 ? (churnedCount / (paidUsers + churnedCount)) * 100 : 0;
    
    // Calculate churn by plan
    const basicChurn = basicSubscribers > 0 ? 
      (cancellations?.filter(c => c.event_data?.plan === 'basic').length || 0) / basicSubscribers * 100 : 0;
    
    const starterChurn = starterSubscribers > 0 ? 
      (cancellations?.filter(c => c.event_data?.plan === 'starter').length || 0) / starterSubscribers * 100 : 0;
    
    // ===============================================
    // CONVERSION RATE CALCULATIONS
    // ===============================================

    const totalUserBase = freeUsers + paidUsers;
    const conversionRate = totalUserBase > 0 ? (paidUsers / totalUserBase) * 100 : 0;

    const previousPeriodPaidUsers = users.filter(u => {
      const createdAt = new Date(u.created_at);
      const isPaidUser = paidPlans.includes(u.subscription_plan) ||
                        u.subscription_status === 'active' ||
                        u.subscription_status === 'trialing';
      return isPaidUser && createdAt >= previousPeriodStart && createdAt < previousPeriodEnd;
    }).length;

    const currentPeriodPaidUsers = users.filter(u => {
      const createdAt = new Date(u.created_at);
      const isPaidUser = paidPlans.includes(u.subscription_plan) ||
                        u.subscription_status === 'active' ||
                        u.subscription_status === 'trialing';
      return isPaidUser && createdAt >= startDate;
    }).length;

    const previousConversionRate = previousPeriodNewUsers > 0 ?
      (previousPeriodPaidUsers / previousPeriodNewUsers) * 100 : 0;
    const currentConversionRate = currentPeriodNewUsers > 0 ?
      (currentPeriodPaidUsers / currentPeriodNewUsers) * 100 : 0;

    const conversionTrend = previousConversionRate > 0 ?
      ((currentConversionRate - previousConversionRate) / previousConversionRate) * 100 :
      currentConversionRate > 0 ? 100 : 0;

    const freeToBasicRate = totalUserBase > 0 ? (basicSubscribers / totalUserBase) * 100 : 0;
    const freeToStarterRate = totalUserBase > 0 ? (starterSubscribers / totalUserBase) * 100 : 0;
    
    // ===============================================
    // GROWTH METRICS
    // ===============================================
    
    const userGrowthRate = previousPeriodNewUsers > 0 ? 
      ((currentPeriodNewUsers - previousPeriodNewUsers) / previousPeriodNewUsers) * 100 : 
      currentPeriodNewUsers > 0 ? 100 : 0;
    
    const mauGrowth = activeUsersPreviousPeriod > 0 ? 
      ((activeUsersThisPeriod - activeUsersPreviousPeriod) / activeUsersPreviousPeriod) * 100 : 
      activeUsersThisPeriod > 0 ? 100 : 0;
    
    // ===============================================
    // RETENTION COHORT ANALYSIS
    // ===============================================
    
    // Get users created in specific periods and check their activity
    const day1Cohort = users.filter(u => {
      const created = new Date(u.created_at);
      const dayAfter = new Date(created);
      dayAfter.setDate(dayAfter.getDate() + 1);
      return u.last_activity_at && new Date(u.last_activity_at) >= dayAfter;
    });
    
    const day7Cohort = users.filter(u => {
      const created = new Date(u.created_at);
      const weekAfter = new Date(created);
      weekAfter.setDate(weekAfter.getDate() + 7);
      return u.last_activity_at && new Date(u.last_activity_at) >= weekAfter;
    });
    
    const day30Cohort = users.filter(u => {
      const created = new Date(u.created_at);
      const monthAfter = new Date(created);
      monthAfter.setDate(monthAfter.getDate() + 30);
      return u.last_activity_at && new Date(u.last_activity_at) >= monthAfter;
    });
    
    const day90Cohort = users.filter(u => {
      const created = new Date(u.created_at);
      const threeMonthsAfter = new Date(created);
      threeMonthsAfter.setDate(threeMonthsAfter.getDate() + 90);
      return u.last_activity_at && new Date(u.last_activity_at) >= threeMonthsAfter;
    });
    
    const retention = {
      day1: totalUsers > 0 ? (day1Cohort.length / totalUsers) * 100 : 0,
      day7: totalUsers > 0 ? (day7Cohort.length / totalUsers) * 100 : 0,
      day30: totalUsers > 0 ? (day30Cohort.length / totalUsers) * 100 : 0,
      day90: totalUsers > 0 ? (day90Cohort.length / totalUsers) * 100 : 0
    };
    
    // ===============================================
    // FINANCIAL METRICS
    // ===============================================
    
    // LTV calculation (simplified: ARPU * average customer lifespan in months)
    const avgCustomerLifespan = churnRate > 0 ? 1 / (churnRate / 100) : 12; // months
    const ltv = arpu * avgCustomerLifespan;
    
    // CAC (Customer Acquisition Cost) - this would need actual marketing spend data
    // For now, using a placeholder
    const cac = 25; // Placeholder - replace with actual CAC calculation
    
    const ltvCacRatio = cac > 0 ? ltv / cac : 0;
    const paybackPeriod = arpu > 0 ? cac / arpu : 0;
    
    // Calculate trends
    const arpuTrend = previousRevenue > 0 ? 
      ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 
      currentRevenue > 0 ? 100 : 0;
    
    const churnTrend = churnRate > 5 ? -Math.abs(churnRate - 5) : Math.abs(5 - churnRate);
    
    // ===============================================
    // BUILD RESPONSE
    // ===============================================
    
    const kpiData = {
      conversion: {
        rate: parseFloat(conversionRate.toFixed(2)),
        trend: parseFloat(conversionTrend.toFixed(2)),
        freeToBasic: parseFloat(freeToBasicRate.toFixed(2)),
        freeToStarter: parseFloat(freeToStarterRate.toFixed(2)),
        trialConversion: 0 // Would need trial tracking
      },
      churn: {
        rate: parseFloat(churnRate.toFixed(2)),
        trend: parseFloat(churnTrend.toFixed(2)),
        monthlyChurn: parseFloat(churnRate.toFixed(2)),
        yearlyChurn: parseFloat((churnRate * 12).toFixed(2)),
        byPlan: {
          basic: parseFloat(basicChurn.toFixed(2)),
          starter: parseFloat(starterChurn.toFixed(2))
        }
      },
      financial: {
        arpu: parseFloat(arpu.toFixed(2)),
        arpuTrend: parseFloat(arpuTrend.toFixed(2)),
        ltv: parseFloat(ltv.toFixed(2)),
        cac: cac,
        ltvCacRatio: parseFloat(ltvCacRatio.toFixed(2)),
        paybackPeriod: parseFloat(paybackPeriod.toFixed(2))
      },
      growth: {
        userGrowthRate: parseFloat(userGrowthRate.toFixed(2)),
        mauGrowth: parseFloat(mauGrowth.toFixed(2)),
        newUsersThisMonth: currentPeriodNewUsers,
        referralRate: 0 // Would need referral tracking
      },
      retention: {
        day1: parseFloat(retention.day1.toFixed(2)),
        day7: parseFloat(retention.day7.toFixed(2)),
        day30: parseFloat(retention.day30.toFixed(2)),
        day90: parseFloat(retention.day90.toFixed(2))
      }
    };
    
    console.log('[KPI Analytics] Calculated metrics:', {
      totalUsers,
      paidUsers,
      activeUsersThisPeriod,
      currentRevenue,
      mrr,
      conversionRate,
      churnRate
    });

    return NextResponse.json(kpiData);

  } catch (error) {
    console.error('Error fetching KPI data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPI data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'admin');