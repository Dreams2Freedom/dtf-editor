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

// Rate limiting: this is READ-ONLY public pricing data (plan names, prices,
// price IDs) that every pricing-page visitor fetches — it performs no payment
// action. Use the fail-OPEN, high-limit 'public' bucket rather than the
// fail-CLOSED 'payment' bucket. Under 'payment', any rate-limiter hiccup
// returned 503 and a shared-IP burst (ad traffic behind carrier NAT) hit the
// 30/min cap — both of which blocked users from loading prices and checking
// out. Actual payment MUTATIONS (create-checkout-session, etc.) stay on the
// fail-closed 'payment' bucket.
export const GET = withRateLimit(handleGet, 'public');
