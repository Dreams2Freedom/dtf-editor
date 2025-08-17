import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';
import { env } from '@/config/env';
import { withRateLimit } from '@/lib/rate-limit';

// Plan price mapping
const PLAN_PRICES: Record<string, { priceId: string; monthlyPrice: number; credits: number }> = {
  basic: {
    priceId: env.STRIPE_BASIC_PLAN_PRICE_ID,
    monthlyPrice: 9.99,
    credits: 20
  },
  starter: {
    priceId: env.STRIPE_STARTER_PLAN_PRICE_ID,
    monthlyPrice: 24.99,
    credits: 60
  }
};

async function handlePost(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { newPlanId } = await request.json();

    if (!newPlanId || !PLAN_PRICES[newPlanId]) {
      return NextResponse.json(
        { error: 'Invalid plan ID' },
        { status: 400 }
      );
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

    // Get current subscription from Stripe
    const subscription = await getStripe().subscriptions.retrieve(profile.stripe_subscription_id);
    
    if (!subscription || subscription.status !== 'active') {
      return NextResponse.json(
        { error: 'Subscription is not active' },
        { status: 400 }
      );
    }

    // Calculate proration preview
    const currentPlan = PLAN_PRICES[profile.subscription_plan];
    const newPlan = PLAN_PRICES[newPlanId];
    
    if (!currentPlan) {
      return NextResponse.json(
        { error: 'Current plan configuration not found' },
        { status: 500 }
      );
    }

    // Calculate days remaining in current period
    const now = Math.floor(Date.now() / 1000);
    const periodEnd = subscription.current_period_end;
    const periodStart = subscription.current_period_start;
    const totalDays = (periodEnd - periodStart) / (24 * 60 * 60);
    const daysRemaining = (periodEnd - now) / (24 * 60 * 60);
    const daysUsed = totalDays - daysRemaining;

    // Calculate prorated amounts
    const currentPlanDailyRate = currentPlan.monthlyPrice / totalDays;
    const newPlanDailyRate = newPlan.monthlyPrice / totalDays;

    // Credit for unused time on current plan
    const unusedCredit = currentPlanDailyRate * daysRemaining;
    
    // Charge for remaining time on new plan
    const newPlanCharge = newPlanDailyRate * daysRemaining;
    
    // Net amount
    const immediateCharge = Math.max(0, newPlanCharge - unusedCredit);
    const creditBalance = Math.max(0, unusedCredit - newPlanCharge);

    // Calculate credit adjustment
    const currentCreditsPerDay = currentPlan.credits / totalDays;
    const newCreditsPerDay = newPlan.credits / totalDays;
    const creditsUsedSoFar = Math.floor(currentCreditsPerDay * daysUsed);
    const newTotalCredits = Math.floor(newCreditsPerDay * totalDays);
    const creditAdjustment = newTotalCredits - currentPlan.credits;

    const isUpgrade = newPlan.monthlyPrice > currentPlan.monthlyPrice;

    return NextResponse.json({
      immediateCharge: Number(immediateCharge.toFixed(2)),
      creditBalance: Number(creditBalance.toFixed(2)),
      nextInvoiceTotal: newPlan.monthlyPrice,
      prorationDate: new Date().toISOString(),
      description: isUpgrade 
        ? `Upgrade charge for ${Math.floor(daysRemaining)} days remaining in billing cycle`
        : `Credit of $${creditBalance.toFixed(2)} will be applied to your next invoice`,
      creditAdjustment,
      daysRemaining: Math.floor(daysRemaining),
      isUpgrade,
      currentPlan: {
        name: profile.subscription_plan,
        price: currentPlan.monthlyPrice,
        credits: currentPlan.credits
      },
      newPlan: {
        name: newPlanId,
        price: newPlan.monthlyPrice,
        credits: newPlan.credits
      }
    });

  } catch (error) {
    console.error('Error previewing plan change:', error);
    return NextResponse.json(
      { error: 'Failed to preview plan change' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'api');