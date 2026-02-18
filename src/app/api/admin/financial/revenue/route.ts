import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet(request: NextRequest) {
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
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '30d';

    // Calculate date range
    const now = new Date();
    const startDate = new Date();

    switch (range) {
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

    // Fetch all payment transactions in range
    const { data: transactions, error: transactionError } = await serviceClient
      .from('payment_transactions')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (transactionError) {
      console.error('Error fetching payment_transactions:', transactionError);
      // Continue with empty array if table doesn't exist yet
    }

    // Fetch all users
    const { data: users, error: usersError } = await serviceClient
      .from('profiles')
      .select('id, subscription_plan, subscription_status, stripe_customer_id, created_at');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    // Calculate metrics using payment_transactions columns
    const allTxns = transactions || [];
    const completedTransactions = allTxns.filter(
      t => t.status === 'completed'
    );
    const subscriptionTransactions = completedTransactions.filter(
      t => t.payment_type === 'subscription'
    );
    const purchaseTransactions = completedTransactions.filter(
      t => t.payment_type === 'one_time'
    );

    // amount is stored in dollars in payment_transactions, convert to cents for display
    const totalRevenue = completedTransactions.reduce(
      (sum, t) => sum + Math.round((t.amount || 0) * 100),
      0
    );

    const totalRefunds = 0; // Refunds tracked separately in credit_transactions

    // Calculate MRR from active subscriptions
    const paidPlans = ['basic', 'starter', 'professional', 'pro'];
    const activeSubscribers =
      users?.filter(
        u =>
          paidPlans.includes(u.subscription_plan) ||
          u.subscription_status === 'active' ||
          u.subscription_status === 'trialing'
      ) || [];

    const planPrices: { [key: string]: number } = {
      starter: 2499,
      professional: 4999,
      pro: 4999,
      basic: 1999,
    };

    const mrr = activeSubscribers.reduce((sum, u) => {
      const price = planPrices[u.subscription_plan] || 0;
      return sum + price;
    }, 0);

    const arr = mrr * 12;

    // Calculate average order value
    const avgOrderValue =
      completedTransactions.length > 0
        ? Math.round(totalRevenue / completedTransactions.length)
        : 0;

    // Calculate LTV (simplified: avg order value * avg customer lifetime in months)
    const avgCustomerLifetime = 6;
    const ltv = avgOrderValue * avgCustomerLifetime;

    // Calculate churn rate
    const totalUsers = users?.length || 0;

    // Paying customers = anyone with a stripe_customer_id (has spent money)
    const allPayingCustomers = users?.filter(u => u.stripe_customer_id) || [];

    // Subscribers = paying customers with an active paid plan
    const subscribers = allPayingCustomers.filter(u =>
      paidPlans.includes(u.subscription_plan) ||
      (u.subscription_status && !['free', 'canceled', 'cancelled', 'past_due'].includes(u.subscription_status) && u.subscription_status !== null)
    );

    // Pay-per-use = has stripe_customer_id but no active subscription
    const payPerUseCustomers = allPayingCustomers.filter(u =>
      !paidPlans.includes(u.subscription_plan)
    );

    const payingCustomers = allPayingCustomers.length;
    const churnedCustomers =
      users?.filter(
        u =>
          u.subscription_status === 'canceled' ||
          u.subscription_status === 'past_due'
      ).length || 0;
    const churnRate =
      payingCustomers > 0 ? (churnedCustomers / payingCustomers) * 100 : 0;

    // Calculate growth rate (compare with previous period)
    const daysDiff = Math.ceil(
      (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - daysDiff);

    const { data: previousTransactions } = await serviceClient
      .from('payment_transactions')
      .select('amount')
      .gte('created_at', previousPeriodStart.toISOString())
      .lt('created_at', startDate.toISOString())
      .eq('status', 'completed');

    const previousRevenue =
      previousTransactions?.reduce(
        (sum, t) => sum + Math.round((t.amount || 0) * 100),
        0
      ) || 0;
    const growthRate =
      previousRevenue > 0
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

    // Calculate conversion rate (paying customers out of all users)
    const conversionRate =
      totalUsers > 0 ? (payingCustomers / totalUsers) * 100 : 0;

    // Revenue breakdown
    const breakdown = {
      subscriptions: subscriptionTransactions.reduce(
        (sum, t) => sum + Math.round((t.amount || 0) * 100),
        0
      ),
      oneTimePurchases: purchaseTransactions.reduce(
        (sum, t) => sum + Math.round((t.amount || 0) * 100),
        0
      ),
      refunds: totalRefunds,
      net: totalRevenue - totalRefunds,
    };

    // Monthly data for charts
    const monthlyData = [];
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    // Group transactions by month
    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      if (monthStart >= startDate) {
        const monthTransactions = allTxns.filter(t => {
          const date = new Date(t.created_at);
          return (
            date >= monthStart &&
            date <= monthEnd &&
            t.status === 'completed'
          );
        });

        const monthSubscriptions = monthTransactions.filter(
          t => t.payment_type === 'subscription'
        );
        const monthPurchases = monthTransactions.filter(
          t => t.payment_type === 'one_time'
        );

        const newCustomers =
          users?.filter(u => {
            const date = new Date(u.created_at);
            return date >= monthStart && date <= monthEnd;
          }).length || 0;

        monthlyData.unshift({
          month: monthNames[monthStart.getMonth()],
          revenue: monthTransactions.reduce(
            (sum, t) => sum + Math.round((t.amount || 0) * 100),
            0
          ),
          subscriptions: monthSubscriptions.reduce(
            (sum, t) => sum + Math.round((t.amount || 0) * 100),
            0
          ),
          purchases: monthPurchases.reduce(
            (sum, t) => sum + Math.round((t.amount || 0) * 100),
            0
          ),
          customers: newCustomers,
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

    const totalPlanRevenue = Object.values(planRevenues).reduce(
      (sum, r) => sum + r,
      0
    );

    const planDistribution = Object.entries(planCounts)
      .filter(([plan]) => plan !== 'free')
      .map(([plan, count]) => ({
        plan: plan.charAt(0).toUpperCase() + plan.slice(1),
        count,
        revenue: planRevenues[plan] || 0,
        percentage:
          totalPlanRevenue > 0
            ? Math.round((planRevenues[plan] / totalPlanRevenue) * 100)
            : 0,
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
        totalUsers,
        payingCustomers,
        subscribers: subscribers.length,
        payPerUseCustomers: payPerUseCustomers.length,
        conversionRate,
      },
      breakdown,
      monthlyData,
      planDistribution,
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
