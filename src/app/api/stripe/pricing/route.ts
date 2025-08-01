import { NextResponse } from 'next/server';
import { getStripeService } from '@/services/stripe';

export async function GET() {
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