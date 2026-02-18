import { NextRequest, NextResponse } from 'next/server';
import { getStripeService } from '@/services/stripe';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { withRateLimit } from '@/lib/rate-limit';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function createOrRecoverCustomer(
  stripeService: ReturnType<typeof getStripeService>,
  userId: string,
  email: string
): Promise<string> {
  const customer = await stripeService.createCustomer(email, undefined);
  // Save the new customer ID to the profile
  await supabase
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);
  console.log('[Portal] Created new Stripe customer:', customer.id, 'for user:', userId);
  return customer.id;
}

async function handlePost(request: NextRequest) {
  try {
    const { userId, returnUrl } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user profile from database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('[Portal] Profile lookup error:', profileError);
      return NextResponse.json(
        { error: 'Could not find user profile' },
        { status: 404 }
      );
    }

    const stripeService = getStripeService();
    let customerId = profile?.stripe_customer_id;

    // If user doesn't have a Stripe customer ID, create one
    if (!customerId) {
      console.log('[Portal] No stripe_customer_id found, creating customer for', userId);
      customerId = await createOrRecoverCustomer(stripeService, userId, profile.email || '');
    }

    // Try to create the portal session, auto-recover if customer is stale
    try {
      const session = await stripeService.createPortalSession(
        customerId,
        returnUrl || `${env.APP_URL}/dashboard`
      );
      return NextResponse.json({ url: session.url });
    } catch (portalError: any) {
      // If the customer doesn't exist in Stripe, create a new one and retry
      if (portalError.type === 'StripeInvalidRequestError' &&
          portalError.message?.includes('No such customer')) {
        console.warn('[Portal] Stale customer ID:', customerId, '- creating new customer');
        customerId = await createOrRecoverCustomer(stripeService, userId, profile.email || '');

        const session = await stripeService.createPortalSession(
          customerId,
          returnUrl || `${env.APP_URL}/dashboard`
        );
        return NextResponse.json({ url: session.url });
      }

      // If billing portal isn't configured in Stripe Dashboard
      if (portalError.type === 'StripeInvalidRequestError' &&
          portalError.message?.includes('portal configuration')) {
        console.error('[Portal] Billing portal not configured in Stripe Dashboard.');
        console.error('[Portal] Go to https://dashboard.stripe.com/settings/billing/portal to configure it.');
        return NextResponse.json(
          { error: 'Billing portal is not yet configured. The admin needs to set it up in the Stripe Dashboard.' },
          { status: 500 }
        );
      }

      throw portalError;
    }
  } catch (error: any) {
    console.error('[Portal] Error creating portal session:', error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'payment');
