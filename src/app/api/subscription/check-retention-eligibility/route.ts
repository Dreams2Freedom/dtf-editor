import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getStripeService } from '@/services/stripe';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user has active subscription
    // Note: subscription_status might contain the plan name instead of 'active'
    const hasActiveSubscription =
      profile.stripe_customer_id &&
      profile.stripe_subscription_id &&
      profile.subscription_status &&
      !['free', 'cancelled', 'cancelling'].includes(
        profile.subscription_status
      );

    if (!hasActiveSubscription) {
      return NextResponse.json({
        eligible: false,
        reason: 'No active subscription found',
        canPause: false,
        canUseDiscount: false,
      });
    }

    // Check pause eligibility
    console.log('Checking pause eligibility for user:', user.id);
    const { data: pauseEligibility, error: pauseError } = await supabase.rpc(
      'check_pause_eligibility',
      { p_user_id: user.id }
    );

    console.log('Pause eligibility result:', pauseEligibility);
    if (pauseError) {
      console.error('Error checking pause eligibility:', pauseError);
    }

    // Check discount eligibility
    console.log('Checking discount eligibility for user:', user.id);
    const { data: discountEligibility, error: discountError } =
      await supabase.rpc('check_discount_eligibility', { p_user_id: user.id });

    console.log('Discount eligibility result:', discountEligibility);
    if (discountError) {
      console.error('Error checking discount eligibility:', discountError);
    }

    // Get pause history
    const { data: pauseHistory } = await supabase
      .from('subscription_events')
      .select('*')
      .eq('user_id', user.id)
      .eq('event_type', 'subscription_paused')
      .order('created_at', { ascending: false })
      .limit(5);

    // Get discount history
    const { data: discountHistory } = await supabase
      .from('subscription_events')
      .select('*')
      .eq('user_id', user.id)
      .in('event_type', ['discount_offered', 'discount_used'])
      .order('created_at', { ascending: false })
      .limit(5);

    // Get current billing period end from Stripe
    let currentPeriodEnd = new Date();
    if (profile.stripe_subscription_id) {
      try {
        const subscription: any = await getStripeService().getSubscription(
          profile.stripe_subscription_id
        );
        // Basil API moved current_period_end onto the per-item billing period;
        // read both paths so the date isn't undefined (-> Invalid Date).
        const periodEnd =
          subscription.current_period_end ??
          subscription.items?.data?.[0]?.current_period_end;
        if (periodEnd) currentPeriodEnd = new Date(periodEnd * 1000);
      } catch (err) {
        console.error('Failed to get subscription period:', err);
        // Fall back to 30 days from now
        currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);
      }
    }

    // Lifetime once-per-account discount: Stripe customer metadata is the
    // source of truth (backed by the DB counter), so the offer is hidden once
    // it's been used even if the DB column never persisted.
    let discountUsed = (profile.discount_used_count || 0) >= 1;
    if (!discountUsed && profile.stripe_customer_id) {
      try {
        const customer: any = await getStripeService().getCustomer(
          profile.stripe_customer_id
        );
        if (customer?.metadata?.retention_discount_used === 'true') {
          discountUsed = true;
        }
      } catch {
        /* ignore — fall back to the DB counter */
      }
    }

    // Calculate pause options based on current billing period end
    const pauseOptions = [
      {
        duration: '2_weeks',
        label: '2 Weeks',
        description: 'Extend your billing by 2 weeks',
        resumeDate: new Date(
          currentPeriodEnd.getTime() + 14 * 24 * 60 * 60 * 1000
        ),
        currentPeriodEnd: currentPeriodEnd,
      },
      {
        duration: '1_month',
        label: '1 Month',
        description: 'Extend your billing by 1 month',
        resumeDate: new Date(
          currentPeriodEnd.getTime() + 30 * 24 * 60 * 60 * 1000
        ),
        currentPeriodEnd: currentPeriodEnd,
      },
      {
        duration: '2_months',
        label: '2 Months',
        description: 'Extend your billing by 2 months',
        resumeDate: new Date(
          currentPeriodEnd.getTime() + 60 * 24 * 60 * 60 * 1000
        ),
        currentPeriodEnd: currentPeriodEnd,
      },
    ];

    // Extract the first result from the arrays if they exist
    const pauseResult =
      Array.isArray(pauseEligibility) && pauseEligibility.length > 0
        ? pauseEligibility[0]
        : pauseEligibility;

    const discountResult =
      Array.isArray(discountEligibility) && discountEligibility.length > 0
        ? discountEligibility[0]
        : discountEligibility;

    console.log('Extracted pause result:', pauseResult);
    console.log('Extracted discount result:', discountResult);

    return NextResponse.json({
      eligible: true,
      canPause: pauseResult?.can_pause || false,
      pauseReason: pauseResult?.reason,
      // Lifetime once-per-account: only offer the 50% discount if it has never
      // been used (mirrors the once-ever rule the apply endpoint enforces).
      canUseDiscount: !discountUsed,
      discountReason: discountResult?.reason,
      pauseOptions,
      pauseHistory: pauseHistory || [],
      discountHistory: discountHistory || [],
      currentPlan: profile.subscription_plan,
      pauseCount: pauseResult?.pause_count || 0,
      discountCount: discountResult?.discount_used_count || 0,
    });
  } catch (error) {
    console.error('Error checking retention eligibility:', error);
    return NextResponse.json(
      { error: 'Failed to check eligibility' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'api');
