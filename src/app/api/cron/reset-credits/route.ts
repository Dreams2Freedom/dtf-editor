import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service';
import { env } from '@/config/env';
import { withRateLimit } from '@/lib/rate-limit';

// This endpoint should be called by a cron job (e.g., daily)
// It will reset credits for all eligible free tier users
async function handleGet(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = env.CRON_SECRET;

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client for admin operations
    const supabase = createServiceRoleSupabaseClient();

    // Call the reset function for all eligible users
    const { data, error } = await supabase.rpc('reset_monthly_credits');

    if (error) {
      console.error('Credit reset error:', error);
      return NextResponse.json(
        { error: 'Failed to reset credits', details: error.message },
        { status: 500 }
      );
    }

    // Log the results
    const usersReset = data?.length || 0;
    console.log(`Credit reset completed. ${usersReset} users updated.`);

    return NextResponse.json({
      success: true,
      message: `Successfully reset credits for ${usersReset} users`,
      users: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Manual endpoint for testing - can reset specific user
async function handlePost(request: NextRequest) {
  try {
    // This endpoint is for manual testing
    const { userId, secret } = await request.json();

    // Simple auth check
    if (secret !== env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleSupabaseClient();

    // Reset credits for specific user or all
    const { data, error } = await supabase.rpc('reset_monthly_credits', {
      p_user_id: userId || null,
    });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to reset credits', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Credits reset successfully',
      data,
    });
  } catch (error) {
    console.error('Manual reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'api');

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'api');
