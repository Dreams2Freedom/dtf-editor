import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type'); // filter by transaction type

    // Build query
    let query = supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add type filter if provided
    if (type) {
      query = query.eq('type', type);
    }

    const { data: transactions, error: transError } = await query;

    if (transError) {
      return NextResponse.json(
        { error: 'Failed to fetch transaction history' },
        { status: 500 }
      );
    }

    // Get credit purchases with expiration info
    const { data: purchases, error: purchaseError } = await supabase
      .from('credit_purchases')
      .select('*')
      .eq('user_id', user.id)
      .gt('credits_remaining', 0)
      .order('expires_at', { ascending: true });

    if (purchaseError) {
      console.error('Failed to fetch purchases:', purchaseError);
    }

    // Get credit summary
    const { data: summary, error: summaryError } = await supabase
      .from('user_credit_summary')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (summaryError) {
      console.error('Failed to fetch summary:', summaryError);
    }

    return NextResponse.json({
      success: true,
      data: {
        transactions: transactions || [],
        activePurchases: purchases || [],
        summary: summary || {
          total_credits: 0,
          active_credits: 0,
          rollover_credits: 0,
          next_expiration_date: null,
          active_purchases: 0
        },
        pagination: {
          limit,
          offset,
          hasMore: transactions?.length === limit
        }
      }
    });

  } catch (error) {
    console.error('Credit history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credit history' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'api');