import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';
import { env } from '@/config/env';
import { withRateLimit } from '@/lib/rate-limit';

// Plan price mapping
const PLAN_PRICES: Record<
  string,
  { priceId: string; monthlyPrice: number; credits: number }
> = {
  basic: {
    priceId: env.STRIPE_BASIC_PLAN_PRICE_ID,
    monthlyPrice: 9.99,
    credits: 20,
  },
  starter: {
    priceId: env.STRIPE_STARTER_PLAN_PRICE_ID,
    monthlyPrice: 24.99,
    credits: 60,
  },
  professional: {
    priceId: env.STRIPE_PROFESSIONAL_PLAN_PRICE_ID,
    monthlyPrice: 49.99,
    credits: 150,
  },
};

async function handlePost(request: NextRequest) {
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

    const { newPlanId, prorationBehavior = 'create_prorations' } =
      await request.json();

    if (!newPlanId || !PLAN_PRICES[newPlanId]) {
      return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_subscription_id || !profile?.subscription_plan) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Can't switch to the same plan
    if (profile.subscription_plan === newPlanId) {
      return NextResponse.json(
        { error: 'Already on this plan' },
        { status: 400 }
      );
    }

    const currentPlan = PLAN_PRICES[profile.subscription_plan];
    const newPlan = PLAN_PRICES[newPlanId];

    if (!currentPlan) {
      return NextResponse.json(
        { error: 'Current plan configuration not found' },
        { status: 500 }
      );
    }

    try {
      // Get current subscription from Stripe
      const subscription = await getStripe().subscriptions.retrieve(
        profile.stripe_subscription_id
      );

      if (!subscription || subscription.status !== 'active') {
        return NextResponse.json(
          { error: 'Subscription is not active' },
          { status: 400 }
        );
      }

      // Get the subscription item ID (needed for update)
      const subscriptionItemId = subscription.items.data[0]?.id;

      if (!subscriptionItemId) {
        return NextResponse.json(
          { error: 'Subscription item not found' },
          { status: 500 }
        );
      }

      // Update the subscription with new plan
      const updatedSubscription = await getStripe().subscriptions.update(
        subscription.id,
        {
          items: [
            {
              id: subscriptionItemId,
              price: newPlan.priceId,
            },
          ],
          metadata: {
            userId: user.id,
            userEmail: user.email || '',
            fromPlan: profile.subscription_plan,
            toPlan: newPlanId,
          },
          proration_behavior:
            prorationBehavior as Stripe.SubscriptionUpdateParams.ProrationBehavior,
        }
      );

      // Calculate credit adjustment
      const now = Math.floor(Date.now() / 1000);
      const periodEnd = subscription.current_period_end;
      const periodStart = subscription.current_period_start;
      const totalDays = (periodEnd - periodStart) / (24 * 60 * 60);
      const daysUsed = (now - periodStart) / (24 * 60 * 60);

      const currentCreditsPerDay = currentPlan.credits / totalDays;
      const newCreditsPerDay = newPlan.credits / totalDays;
      const creditsUsedSoFar = Math.floor(currentCreditsPerDay * daysUsed);
      const newTotalCredits = Math.floor(newCreditsPerDay * totalDays);

      // Update user's credits
      const creditAdjustment = newTotalCredits - currentPlan.credits;

      if (creditAdjustment !== 0) {
        // Add or remove credits based on plan change
        const { error: creditError } = await supabase.rpc(
          'adjust_user_credits',
          {
            p_user_id: user.id,
            p_adjustment: creditAdjustment,
            p_operation:
              creditAdjustment > 0 ? 'plan_upgrade' : 'plan_downgrade',
            p_description: `Plan changed from ${profile.subscription_plan} to ${newPlanId}`,
          }
        );

        if (creditError) {
          console.error('Error adjusting credits:', creditError);
        }
      }

      // Update user profile with new plan
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          subscription_plan: newPlanId,
          subscription_status: newPlanId, // Use plan ID, not Stripe status (BUG FIX)
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
      }

      // Log the plan change event
      await supabase.from('subscription_events').insert({
        user_id: user.id,
        event_type: 'plan_changed',
        event_data: {
          from_plan: profile.subscription_plan,
          to_plan: newPlanId,
          credit_adjustment: creditAdjustment,
          proration_behavior: prorationBehavior,
        },
      });

      // Check if immediate payment is needed
      let paymentUrl = null;
      if (prorationBehavior === 'always_invoice') {
        // Create invoice and get payment URL
        const invoice = await getStripe().invoices.create({
          customer: profile.stripe_customer_id,
          auto_advance: true,
        });

        await getStripe().invoices.finalizeInvoice(invoice.id);

        // Get the payment intent
        const finalizedInvoice = await getStripe().invoices.retrieve(
          invoice.id
        );
        if (
          finalizedInvoice.payment_intent &&
          typeof finalizedInvoice.payment_intent === 'string'
        ) {
          const paymentIntent = await getStripe().paymentIntents.retrieve(
            finalizedInvoice.payment_intent
          );
          paymentUrl = paymentIntent.next_action?.redirect_to_url?.url || null;
        }

        // If no payment URL, get hosted invoice URL
        if (!paymentUrl && finalizedInvoice.hosted_invoice_url) {
          paymentUrl = finalizedInvoice.hosted_invoice_url;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Successfully changed to ${newPlanId} plan`,
        newPlan: newPlanId,
        creditAdjustment,
        paymentUrl,
        subscription: {
          id: updatedSubscription.id,
          status: updatedSubscription.status,
          current_period_end: new Date(
            updatedSubscription.current_period_end * 1000
          ).toISOString(),
        },
      });
    } catch (stripeError: any) {
      console.error('Stripe error:', stripeError);
      return NextResponse.json(
        { error: stripeError.message || 'Failed to update subscription' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error changing plan:', error);
    return NextResponse.json(
      { error: 'Failed to change plan' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'api');
