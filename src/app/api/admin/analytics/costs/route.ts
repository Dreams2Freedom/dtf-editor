import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ApiCostTracker } from '@/lib/api-cost-tracker';
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

    // Get time range from query params
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');

    // Get cost analytics
    const analytics = await ApiCostTracker.getCostAnalytics(days);
    const dailySummaries = await ApiCostTracker.getDailySummaries(days);

    if (!analytics) {
      return NextResponse.json(
        {
          error: 'Failed to fetch cost analytics',
          analytics: null,
          dailySummaries: [],
        },
        { status: 500 }
      );
    }

    console.log('[API Cost Analytics] Fetched data:', {
      totalRequests: analytics.summary.totalRequests,
      totalCost: `$${analytics.summary.totalCost.toFixed(2)}`,
      totalRevenue: `$${analytics.summary.totalRevenue.toFixed(2)}`,
      profitMargin: `${analytics.summary.profitMargin.toFixed(1)}%`,
      providers: Object.keys(analytics.byProvider),
    });

    return NextResponse.json({
      analytics,
      dailySummaries,
    });
  } catch (error) {
    console.error('Error fetching cost analytics:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch cost analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'admin');
