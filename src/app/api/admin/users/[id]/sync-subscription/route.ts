import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import { getStripeService } from '@/services/stripe';
import { withRateLimit } from '@/lib/rate-limit';

// Price amount (cents) → plan ID fallback mapping
const PLAN_PRICE_AMOUNTS: Record<number, string> = {
  999: 'basic', // $9.99
  2499: 'starter', // $24.99
  4999: 'professional', // $49.99
};

async function handlePost(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;

    // Authenticate admin
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();

    const { data: adminProfile } = await serviceClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the target user's profile
    const { data: targetProfile, error: profileError } = await serviceClient
      .from('profiles')
      .select(
        'id, stripe_customer_id, stripe_subscription_id, subscription_plan, subscription_status'
      )
      .eq('id', targetUserId)
      .single();

    if (profileError || !targetProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const stripeService = getStripeService();
    const plans = stripeService.getSubscriptionPlans();
    let subscription = null;
    let resolvedPlan = null;

    // Try to get subscription from the stored subscription ID
    if (targetProfile.stripe_subscription_id) {
      subscription = await stripeService.getSubscription(
        targetProfile.stripe_subscription_id
      );
    }

    // If no stored subscription ID, try to find active subscription by customer ID
    if (!subscription && targetProfile.stripe_customer_id) {
      const subscriptions = await stripeService.listSubscriptions({
        customer: targetProfile.stripe_customer_id,
        status: 'active',
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        subscription = subscriptions.data[0];
      }
    }

    if (!subscription) {
      return NextResponse.json(
        {
          error: 'No active Stripe subscription found for this user',
          profile: {
            stripe_customer_id: targetProfile.stripe_customer_id,
            stripe_subscription_id: targetProfile.stripe_subscription_id,
            current_plan: targetProfile.subscription_plan,
          },
        },
        { status: 404 }
      );
    }

    // Extract price ID and resolve plan
    const priceId = subscription.items.data[0]?.price.id;
    const priceAmount = subscription.items.data[0]?.price.unit_amount;

    // Try exact match first
    resolvedPlan = plans.find(
      (p: any) => p.stripePriceId && p.stripePriceId === priceId
    );

    // Fallback by price amount
    if (!resolvedPlan && priceAmount) {
      const planId = PLAN_PRICE_AMOUNTS[priceAmount];
      if (planId) {
        resolvedPlan = plans.find((p: any) => p.id === planId);
      }
    }

    if (!resolvedPlan) {
      return NextResponse.json(
        {
          error: 'Could not determine plan from subscription',
          debug: {
            priceId,
            priceAmount,
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            configuredPlans: plans.map((p: any) => ({
              id: p.id,
              priceId: p.stripePriceId || '(not set)',
            })),
          },
        },
        { status: 422 }
      );
    }

    // Update the user's profile
    const updateData: Record<string, string> = {
      stripe_subscription_id: subscription.id,
      subscription_plan: resolvedPlan.id,
      subscription_status: resolvedPlan.id,
      subscription_current_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
    };

    const { error: updateError } = await serviceClient
      .from('profiles')
      .update(updateData)
      .eq('id', targetUserId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Synced subscription: ${resolvedPlan.name} plan`,
      previous: {
        subscription_plan: targetProfile.subscription_plan,
        subscription_status: targetProfile.subscription_status,
      },
      updated: {
        subscription_plan: resolvedPlan.id,
        subscription_status: resolvedPlan.id,
        stripe_subscription_id: subscription.id,
        period_end: updateData.subscription_current_period_end,
      },
      stripe: {
        subscriptionId: subscription.id,
        priceId,
        priceAmount,
        status: subscription.status,
      },
    });
  } catch (error: unknown) {
    console.error('Error syncing subscription:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = withRateLimit(handlePost, 'admin');
