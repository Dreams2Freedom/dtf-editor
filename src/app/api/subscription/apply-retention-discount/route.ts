import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

// Initialize Stripe only when the function is called, not at module level
let stripe: Stripe | null = null;

function getStripe() {
  if (!stripe) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia' as any,
    });
  }
  return stripe;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check eligibility
    const { data: eligibility, error: eligibilityError } = await supabase
      .rpc('check_discount_eligibility', { p_user_id: user.id });

    // Handle array response from RPC
    const eligibilityResult = Array.isArray(eligibility) && eligibility.length > 0 
      ? eligibility[0] 
      : eligibility;

    console.log('Apply discount - eligibility check:', eligibilityResult);

    if (eligibilityError || !eligibilityResult?.can_use_discount) {
      return NextResponse.json(
        { error: eligibilityResult?.reason || 'Not eligible for retention discount' },
        { status: 403 }
      );
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id || !profile?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    try {
      // Create a one-time 50% off coupon
      const coupon = await getStripe().coupons.create({
        percent_off: 50,
        duration: 'once',
        max_redemptions: 1,
        metadata: {
          type: 'retention_offer',
          user_id: user.id,
          created_for: profile.email
        }
      });

      // Apply coupon to subscription
      const subscription = await getStripe().subscriptions.update(
        profile.stripe_subscription_id,
        {
          discounts: [{
            coupon: coupon.id
          }]
        }
      );

      // Calculate next eligible date (6 months from now)
      const nextEligibleDate = new Date();
      nextEligibleDate.setMonth(nextEligibleDate.getMonth() + 6);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          discount_used_count: (profile.discount_used_count || 0) + 1,
          last_discount_date: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
      }

      // Log event
      await supabase
        .from('subscription_events')
        .insert({
          user_id: user.id,
          event_type: 'discount_used',
          event_data: {
            coupon_id: coupon.id,
            percent_off: 50,
            applied_to_subscription: profile.stripe_subscription_id,
            next_billing_amount: subscription.items.data[0].price.unit_amount / 2
          }
        });

      // Calculate the next billing info based on subscription data
      const nextBillingDate = new Date(subscription.current_period_end * 1000);
      const originalAmount = subscription.items.data[0].price.unit_amount / 100;
      const discountAmount = originalAmount * 0.5; // 50% off
      const finalAmount = originalAmount - discountAmount;

      return NextResponse.json({
        success: true,
        message: '50% discount applied to your next billing cycle',
        discount: {
          coupon_id: coupon.id,
          percent_off: 50,
          valid_for: 'next billing cycle only'
        },
        nextBilling: {
          date: nextBillingDate.toISOString(),
          originalAmount: originalAmount,
          discountAmount: discountAmount,
          finalAmount: finalAmount
        },
        nextEligibleDate: nextEligibleDate.toISOString()
      });

    } catch (stripeError: any) {
      console.error('Stripe error:', stripeError);
      return NextResponse.json(
        { error: 'Failed to apply discount: ' + stripeError.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error applying retention discount:', error);
    return NextResponse.json(
      { error: 'Failed to apply discount' },
      { status: 500 }
    );
  }
}