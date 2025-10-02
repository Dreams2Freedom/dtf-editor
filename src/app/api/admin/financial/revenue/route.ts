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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '30d';

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch(range) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Use service role client for data access
    const serviceClient = createServiceRoleSupabaseClient();

    // Fetch all transactions in range
    const { data: transactions, error: transactionError } = await serviceClient
      .from('transactions')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (transactionError) {
      console.error('Error fetching transactions:', transactionError);
      throw transactionError;
    }

    // Fetch all users
    const { data: users, error: usersError } = await serviceClient
      .from('profiles')
      .select('id, subscription_plan, subscription_status, created_at');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    // Calculate metrics
    const completedTransactions = transactions?.filter(t => t.status === 'completed') || [];
    const refundTransactions = transactions?.filter(t => t.type === 'refund') || [];
    const subscriptionTransactions = completedTransactions.filter(t => t.type === 'subscription');
    const purchaseTransactions = completedTransactions.filter(t => t.type === 'purchase');

    const totalRevenue = completedTransactions
      .filter(t => t.type !== 'refund')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalRefunds = refundTransactions
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Calculate MRR from active subscriptions
    const paidPlans = ['basic', 'starter', 'professional', 'pro'];
    const activeSubscribers = users?.filter(u => 
      paidPlans.includes(u.subscription_plan) ||
      u.subscription_status === 'active' ||
      u.subscription_status === 'trialing'
    ) || [];

    const planPrices: { [key: string]: number } = {
      starter: 2499,
      professional: 4999,
      pro: 4999,
      basic: 1999
    };

    const mrr = activeSubscribers.reduce((sum, u) => {
      const price = planPrices[u.subscription_plan] || 0;
      return sum + price;
    }, 0);

    const arr = mrr * 12;

    // Calculate average order value
    const avgOrderValue = completedTransactions.length > 0
      ? Math.round(totalRevenue / completedTransactions.length)
      : 0;

    // Calculate LTV (simplified: avg order value * avg customer lifetime in months)
    const avgCustomerLifetime = 6; // Assume 6 months for now
    const ltv = avgOrderValue * avgCustomerLifetime;

    // Calculate churn rate
    const totalCustomers = users?.length || 0;
    const payingCustomers = activeSubscribers.length;
    const churnedCustomers = users?.filter(u => 
      u.subscription_status === 'canceled' || 
      u.subscription_status === 'past_due'
    ).length || 0;
    const churnRate = totalCustomers > 0 ? (churnedCustomers / totalCustomers) * 100 : 0;

    // Calculate growth rate (compare with previous period)
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - (now.getDate() - startDate.getDate()));
    
    const { data: previousTransactions } = await serviceClient
      .from('transactions')
      .select('amount')
      .gte('created_at', previousPeriodStart.toISOString())
      .lt('created_at', startDate.toISOString())
      .eq('status', 'completed')
      .neq('type', 'refund');

    const previousRevenue = previousTransactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    const growthRate = previousRevenue > 0 
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;

    // Calculate conversion rate
    const conversionRate = totalCustomers > 0 ? (payingCustomers / totalCustomers) * 100 : 0;

    // Revenue breakdown
    const breakdown = {
      subscriptions: subscriptionTransactions.reduce((sum, t) => sum + (t.amount || 0), 0),
      oneTimePurchases: purchaseTransactions.reduce((sum, t) => sum + (t.amount || 0), 0),
      refunds: totalRefunds,
      net: totalRevenue - totalRefunds
    };

    // Monthly data for charts
    const monthlyData = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Group transactions by month
    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      if (monthStart >= startDate) {
        const monthTransactions = transactions?.filter(t => {
          const date = new Date(t.created_at);
          return date >= monthStart && date <= monthEnd && t.status === 'completed' && t.type !== 'refund';
        }) || [];

        const monthSubscriptions = monthTransactions.filter(t => t.type === 'subscription');
        const monthPurchases = monthTransactions.filter(t => t.type === 'purchase');
        
        const newCustomers = users?.filter(u => {
          const date = new Date(u.created_at);
          return date >= monthStart && date <= monthEnd;
        }).length || 0;

        monthlyData.unshift({
          month: monthNames[monthStart.getMonth()],
          revenue: monthTransactions.reduce((sum, t) => sum + (t.amount || 0), 0),
          subscriptions: monthSubscriptions.reduce((sum, t) => sum + (t.amount || 0), 0),
          purchases: monthPurchases.reduce((sum, t) => sum + (t.amount || 0), 0),
          customers: newCustomers
        });
      }
    }

    // Plan distribution
    const planCounts: { [key: string]: number } = {};
    const planRevenues: { [key: string]: number } = {};
    
    activeSubscribers.forEach(u => {
      const plan = u.subscription_plan || 'free';
      planCounts[plan] = (planCounts[plan] || 0) + 1;
      planRevenues[plan] = (planRevenues[plan] || 0) + (planPrices[plan] || 0);
    });

    const totalPlanRevenue = Object.values(planRevenues).reduce((sum, r) => sum + r, 0);
    
    const planDistribution = Object.entries(planCounts)
      .filter(([plan]) => plan !== 'free')
      .map(([plan, count]) => ({
        plan: plan.charAt(0).toUpperCase() + plan.slice(1),
        count,
        revenue: planRevenues[plan] || 0,
        percentage: totalPlanRevenue > 0 
          ? Math.round((planRevenues[plan] / totalPlanRevenue) * 100) 
          : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({
      metrics: {
        totalRevenue,
        mrr,
        arr,
        avgOrderValue,
        ltv,
        churnRate,
        growthRate,
        totalCustomers,
        payingCustomers,
        conversionRate
      },
      breakdown,
      monthlyData,
      planDistribution
    });

  } catch (error) {
    console.error('Error in revenue API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue data' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'admin');