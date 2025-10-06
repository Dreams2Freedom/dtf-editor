import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { env } from '@/config/env';
import { withRateLimit } from '@/lib/rate-limit';

// This endpoint can be called by:
// 1. Stripe webhooks when subscription renews
// 2. A scheduled cron job
// 3. Manually for testing

async function handlePost(request: NextRequest) {
  try {
    // Check for API key in headers for cron job access
    const apiKey = request.headers.get('x-api-key');
    const isAuthorized = apiKey === env.SUPABASE_SERVICE_ROLE_KEY;

    // If not authorized via API key, check if it's from a webhook
    const stripeSignature = request.headers.get('stripe-signature');

    if (!isAuthorized && !stripeSignature) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, resetAll = false } = body;

    const supabase = await createServerSupabaseClient();

    if (resetAll && isAuthorized) {
      // Reset credits for all active subscriptions
      const { data, error } = await supabase.rpc('reset_monthly_credits');

      if (error) {
        console.error('Error resetting all credits:', error);
        return NextResponse.json(
          { error: 'Failed to reset credits' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Monthly credits reset completed',
        result: data,
      });
    } else if (userId) {
      // Check if specific user needs credit reset
      const { data: needsReset, error: checkError } = await supabase.rpc(
        'check_credit_reset_needed',
        { p_user_id: userId }
      );

      if (checkError) {
        console.error('Error checking credit reset:', checkError);
        return NextResponse.json(
          { error: 'Failed to check credit reset' },
          { status: 500 }
        );
      }

      if (!needsReset) {
        return NextResponse.json({
          success: true,
          message: 'Credit reset not needed',
          reset: false,
        });
      }

      // Get user's subscription plan
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_plan')
        .eq('id', userId)
        .single();

      if (!profile) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Determine credits based on plan
      const planCredits = {
        basic: 20,
        starter: 60,
        free: 2,
      };

      const credits =
        planCredits[profile.subscription_plan as keyof typeof planCredits] || 0;

      // Reset user credits
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          credits,
          credits_remaining: credits,
          credits_reset_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating credits:', updateError);
        return NextResponse.json(
          { error: 'Failed to reset credits' },
          { status: 500 }
        );
      }

      // Log the transaction
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        amount: credits,
        operation: 'monthly_reset',
        description: `Monthly credit reset for ${profile.subscription_plan} plan`,
        created_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: 'Credits reset successfully',
        credits,
        reset: true,
      });
    } else {
      return NextResponse.json(
        { error: 'Missing userId or resetAll parameter' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in credit reset:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'api');
