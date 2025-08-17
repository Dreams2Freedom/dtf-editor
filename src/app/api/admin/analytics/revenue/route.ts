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
    const range = searchParams.get('range') || '30d';
    
    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    
    switch (range) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default: // 30d
        startDate.setDate(now.getDate() - 30);
    }

    // Fetch credit transactions (our revenue source)
    const { data: transactions } = await supabase
      .from('credit_transactions')
      .select('*, profiles!inner(email, subscription_plan)')
      .eq('type', 'purchase')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    // Get all users for plan distribution
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('id, subscription_plan, subscription_status, created_at')
      .not('subscription_plan', 'eq', 'free')
      .eq('subscription_status', 'active');

    // Calculate daily revenue
    const dailyRevenue = new Map<string, { revenue: number; transactions: number }>();
    
    transactions?.forEach(transaction => {
      const date = new Date(transaction.created_at).toISOString().split('T')[0];
      const existing = dailyRevenue.get(date) || { revenue: 0, transactions: 0 };
      dailyRevenue.set(date, {
        revenue: existing.revenue + (transaction.amount || 0) / 100,
        transactions: existing.transactions + 1
      });
    });

    // Convert to array and sort
    const daily = Array.from(dailyRevenue.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate monthly revenue
    const monthlyRevenue = new Map<string, { revenue: number; mrr: number; new_customers: number }>();
    
    transactions?.forEach(transaction => {
      const month = new Date(transaction.created_at).toISOString().slice(0, 7);
      const existing = monthlyRevenue.get(month) || { revenue: 0, mrr: 0, new_customers: 0 };
      monthlyRevenue.set(month, {
        revenue: existing.revenue + (transaction.amount || 0) / 100,
        mrr: existing.mrr,
        new_customers: existing.new_customers
      });
    });

    // Calculate MRR for each month based on active subscriptions
    const planPrices: Record<string, number> = {
      basic: 9.99,
      starter: 19.99,
      professional: 39.99
    };

    allUsers?.forEach(user => {
      const month = new Date().toISOString().slice(0, 7);
      const existing = monthlyRevenue.get(month) || { revenue: 0, mrr: 0, new_customers: 0 };
      const planPrice = planPrices[user.subscription_plan] || 0;
      
      monthlyRevenue.set(month, {
        ...existing,
        mrr: existing.mrr + planPrice
      });
    });

    const monthly = Array.from(monthlyRevenue.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Calculate plan distribution
    const planCounts = new Map<string, { count: number; revenue: number }>();
    
    allUsers?.forEach(user => {
      const existing = planCounts.get(user.subscription_plan) || { count: 0, revenue: 0 };
      const planPrice = planPrices[user.subscription_plan] || 0;
      
      planCounts.set(user.subscription_plan, {
        count: existing.count + 1,
        revenue: existing.revenue + planPrice
      });
    });

    const planDistribution = Array.from(planCounts.entries())
      .map(([plan, data]) => ({ plan, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    // Get top customers by total spent
    const customerSpending = new Map<string, { 
      email: string; 
      total_spent: number; 
      subscription_plan: string;
      created_at: string;
    }>();

    transactions?.forEach(transaction => {
      const userId = transaction.user_id;
      const existing = customerSpending.get(userId);
      
      if (existing) {
        existing.total_spent += (transaction.amount || 0) / 100;
      } else {
        customerSpending.set(userId, {
          email: transaction.profiles.email,
          total_spent: (transaction.amount || 0) / 100,
          subscription_plan: transaction.profiles.subscription_plan || 'free',
          created_at: transaction.created_at
        });
      }
    });

    const topCustomers = Array.from(customerSpending.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, 10);

    // Calculate metrics
    const totalRevenue = transactions?.reduce((sum, t) => sum + (t.amount || 0) / 100, 0) || 0;
    const currentMRR = allUsers?.reduce((sum, user) => {
      return sum + (planPrices[user.subscription_plan] || 0);
    }, 0) || 0;
    
    const previousMonthRevenue = transactions
      ?.filter(t => {
        const transactionDate = new Date(t.created_at);
        const prevMonth = new Date();
        prevMonth.setMonth(prevMonth.getMonth() - 1);
        return transactionDate.getMonth() === prevMonth.getMonth();
      })
      .reduce((sum, t) => sum + (t.amount || 0) / 100, 0) || 0;

    const growthRate = previousMonthRevenue > 0 
      ? ((totalRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
      : 0;

    const avgOrderValue = transactions && transactions.length > 0 
      ? totalRevenue / transactions.length 
      : 0;

    // Simple LTV calculation (MRR * 12 for annual, simplified)
    const ltv = currentMRR * 12;

    const revenueData = {
      daily,
      monthly,
      planDistribution,
      topCustomers,
      metrics: {
        total_revenue: totalRevenue,
        mrr: currentMRR,
        arr: currentMRR * 12,
        average_order_value: avgOrderValue,
        ltv: ltv / (allUsers?.length || 1), // Per customer LTV
        growth_rate: growthRate
      }
    };

    return NextResponse.json(revenueData);

  } catch (error) {
    console.error('Error fetching revenue data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue data' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'admin');