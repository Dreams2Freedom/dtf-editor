import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get user details
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get credit transactions
    const { data: creditTransactions } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get total credits used
    const totalCreditsUsed = creditTransactions?.reduce((sum, t) => 
      t.amount < 0 ? sum + Math.abs(t.amount) : sum, 0
    ) || 0;

    // Get API usage summary
    const { data: apiUsageLogs } = await supabase
      .from('api_usage_logs')
      .select('*')
      .eq('user_id', id)
      .eq('processing_status', 'success');

    // Calculate API usage by service
    const apiUsageByService = apiUsageLogs?.reduce((acc: any, log: any) => {
      const service = log.api_provider || 'unknown';
      acc[service] = (acc[service] || 0) + 1;
      return acc;
    }, {
      deep_image: 0,
      clipping_magic: 0,
      vectorizer: 0,
      openai: 0
    }) || {
      deep_image: 0,
      clipping_magic: 0,
      vectorizer: 0,
      openai: 0
    };

    // Get cost summaries for profitability
    const { data: costSummaries } = await supabase
      .from('api_cost_summaries')
      .select('total_cost, total_revenue, profit_margin')
      .eq('user_id', id);

    const totalCost = costSummaries?.reduce((sum: number, s: any) => sum + (s.total_cost || 0), 0) || 0;
    const totalRevenue = costSummaries?.reduce((sum: number, s: any) => sum + (s.total_revenue || 0), 0) || 0;
    const avgProfitMargin = costSummaries?.length 
      ? costSummaries.reduce((sum: number, s: any) => sum + (s.profit_margin || 0), 0) / costSummaries.length
      : 0;

    // Get recent activity (simplified - you could expand this)
    const recentActivity = [
      ...(creditTransactions || []).map((t: any) => ({
        id: t.id,
        type: 'credit_transaction',
        description: t.description,
        created_at: t.created_at,
        metadata: { amount: t.amount }
      })),
      ...(apiUsageLogs || []).slice(0, 5).map((log: any) => ({
        id: log.id,
        type: 'api_usage',
        description: `Processed image using ${log.api_provider}`,
        created_at: log.created_at,
        metadata: { provider: log.api_provider }
      }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
     .slice(0, 10);

    // Build response
    const userDetails = {
      id: userProfile.id,
      email: userProfile.email,
      full_name: userProfile.full_name,
      plan: userProfile.subscription_plan || 'free',
      status: userProfile.is_active !== false ? 'active' : 'suspended',
      credits_remaining: userProfile.credits_remaining || 0,
      created_at: userProfile.created_at,
      updated_at: userProfile.updated_at,
      last_sign_in_at: userProfile.last_sign_in_at,
      stripe_customer_id: userProfile.stripe_customer_id,
      subscription_id: userProfile.stripe_subscription_id,
      subscription_status: userProfile.subscription_status,
      subscription_end_date: userProfile.subscription_end_date,
      total_credits_used: totalCreditsUsed,
      images_processed: apiUsageLogs?.length || 0,
      credit_transactions: creditTransactions || [],
      recent_activity: recentActivity,
      api_usage_summary: {
        total_operations: apiUsageLogs?.length || 0,
        by_service: apiUsageByService,
        total_cost: totalCost,
        total_revenue: totalRevenue,
        profit_margin: avgProfitMargin
      }
    };

    return NextResponse.json(userDetails);
  } catch (error) {
    console.error('User details API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}