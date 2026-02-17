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

    // Fetch from payment_transactions (Stripe payments)
    const { data: paymentTxns, error: paymentError } = await serviceClient
      .from('payment_transactions')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (paymentError) {
      console.error('Error fetching payment_transactions:', paymentError);
      // Table may not exist yet — continue with empty array
    }

    // Fetch from credit_transactions (credit movements)
    const { data: creditTxns, error: creditError } = await serviceClient
      .from('credit_transactions')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (creditError) {
      console.error('Error fetching credit_transactions:', creditError);
      // Table may not exist yet — continue with empty array
    }

    // Gather unique user IDs from both sources
    const allUserIds = new Set<string>();
    (paymentTxns || []).forEach(t => allUserIds.add(t.user_id));
    (creditTxns || []).forEach(t => allUserIds.add(t.user_id));

    // Fetch user details
    let userMap = new Map<string, { email: string; name: string }>();
    if (allUserIds.size > 0) {
      const { data: users } = await serviceClient
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', [...allUserIds]);

      userMap = new Map(
        users?.map(u => [
          u.id,
          {
            email: u.email || 'unknown',
            name:
              `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown',
          },
        ]) || []
      );
    }

    // Format payment transactions
    const formattedPayments = (paymentTxns || []).map(t => {
      const userInfo = userMap.get(t.user_id) || {
        email: 'unknown',
        name: 'Unknown',
      };
      return {
        id: t.id,
        user_id: t.user_id,
        user_email: userInfo.email,
        user_name: userInfo.name,
        type: t.payment_type === 'subscription' ? 'subscription' : 'purchase',
        amount: Math.round((t.amount || 0) * 100), // Convert dollars to cents for display
        credits: t.credits_purchased || null,
        status: t.status || 'completed',
        stripe_payment_id: t.stripe_payment_intent_id || null,
        description:
          t.subscription_tier
            ? `${t.payment_type === 'subscription' ? 'Subscription' : 'Purchase'} - ${t.subscription_tier}`
            : `${t.payment_type === 'subscription' ? 'Subscription payment' : 'Credit purchase'} - ${t.credits_purchased || 0} credits`,
        created_at: t.created_at,
      };
    });

    // Format credit transactions (usage, refunds, resets)
    const formattedCredits = (creditTxns || [])
      .filter(t => ['usage', 'refund'].includes(t.type))
      .map(t => {
        const userInfo = userMap.get(t.user_id) || {
          email: 'unknown',
          name: 'Unknown',
        };
        return {
          id: t.id,
          user_id: t.user_id,
          user_email: userInfo.email,
          user_name: userInfo.name,
          type: t.type as 'usage' | 'refund',
          amount: 0, // Credit transactions don't have monetary value
          credits: Math.abs(t.amount),
          status: 'completed' as const,
          stripe_payment_id: null,
          description: t.description || `${t.type} - ${Math.abs(t.amount)} credits`,
          created_at: t.created_at,
        };
      });

    // Merge and sort by date descending
    const allTransactions = [...formattedPayments, ...formattedCredits].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Calculate metrics (based on payment transactions only for revenue)
    const completedPayments = formattedPayments.filter(
      t => t.status === 'completed'
    );
    const metrics = {
      total_revenue: completedPayments.reduce((sum, t) => sum + t.amount, 0),
      total_transactions: allTransactions.length,
      successful_transactions: allTransactions.filter(
        t => t.status === 'completed'
      ).length,
      failed_transactions: allTransactions.filter(t => t.status === 'failed')
        .length,
      refunded_amount: formattedCredits
        .filter(t => t.type === 'refund')
        .reduce((sum, t) => sum + (t.credits || 0), 0),
      average_transaction: 0,
    };

    if (completedPayments.length > 0) {
      metrics.average_transaction = Math.round(
        metrics.total_revenue / completedPayments.length
      );
    }

    return NextResponse.json({
      transactions: allTransactions,
      metrics,
    });
  } catch (error) {
    console.error('Error in transactions API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'admin');
