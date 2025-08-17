import { NextResponse } from 'next/server';
import { getStripeService } from '@/services/stripe';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet() {
  try {
    const stripeService = getStripeService();
    
    const plans = stripeService.getSubscriptionPlans();
    const packages = stripeService.getPayAsYouGoPackages();
    
    return NextResponse.json({
      subscriptionPlans: plans,
      payAsYouGoPackages: packages,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch pricing information' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'payment');