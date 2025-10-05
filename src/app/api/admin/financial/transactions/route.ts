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
    const startDate = new Date();
    
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

    // Fetch transactions
    const { data: transactions, error: transactionError } = await serviceClient
      .from('transactions')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (transactionError) {
      console.error('Error fetching transactions:', transactionError);
      throw transactionError;
    }

    // Fetch user details
    const userIds = [...new Set(transactions?.map(t => t.user_id) || [])];
    const { data: users } = await serviceClient
      .from('profiles')
      .select('id, email, first_name, last_name')
      .in('id', userIds);

    // Map user details to transactions
    const userMap = new Map(
      users?.map(u => [u.id, { 
        email: u.email, 
        name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown'
      }])
    );

    // Format transactions
    const formattedTransactions = transactions?.map(t => {
      const userInfo = userMap.get(t.user_id) || { email: 'unknown', name: 'Unknown' };
      return {
        id: t.id,
        user_id: t.user_id,
        user_email: userInfo.email,
        user_name: userInfo.name,
        type: t.type || 'purchase',
        amount: t.amount || 0,
        credits: t.metadata?.credits || null,
        status: t.status || 'completed',
        stripe_payment_id: t.stripe_payment_id || null,
        description: t.description || `${t.type || 'Purchase'} - ${userInfo.email}`,
        created_at: t.created_at
      };
    }) || [];

    // Calculate metrics
    const metrics = {
      total_revenue: formattedTransactions
        .filter(t => t.status === 'completed' && t.type !== 'refund')
        .reduce((sum, t) => sum + t.amount, 0),
      total_transactions: formattedTransactions.length,
      successful_transactions: formattedTransactions.filter(t => t.status === 'completed').length,
      failed_transactions: formattedTransactions.filter(t => t.status === 'failed').length,
      refunded_amount: formattedTransactions
        .filter(t => t.type === 'refund')
        .reduce((sum, t) => sum + t.amount, 0),
      average_transaction: 0
    };

    if (metrics.successful_transactions > 0) {
      metrics.average_transaction = Math.round(
        metrics.total_revenue / metrics.successful_transactions
      );
    }

    return NextResponse.json({
      transactions: formattedTransactions,
      metrics
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