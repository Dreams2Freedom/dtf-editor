import { NextRequest, NextResponse } from 'next/server';
import { getStripeService } from '@/services/stripe';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { withRateLimit } from '@/lib/rate-limit';
import Stripe from 'stripe';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Lazily create a Stripe instance for customer search (StripeService doesn't expose this)
let stripeClient: Stripe | null = null;
function getStripeClient(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-06-30.basil',
    });
  }
  return stripeClient;
}

async function findOrCreateCustomer(
  userId: string,
  email: string
): Promise<string> {
  const stripe = getStripeClient();

  // Search for an existing Stripe customer with this email first
  if (email) {
    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data.length > 0) {
      const customerId = existing.data[0].id;
      console.log('[Portal] Found existing Stripe customer:', customerId, 'for email:', email);
      // Update the profile with the found customer ID
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
      return customerId;
    }
  }

  // No existing customer found - create a new one
  const stripeService = getStripeService();
  const customer = await stripeService.createCustomer(email, undefined);
  console.log('[Portal] Created new Stripe customer:', customer.id, 'for user:', userId);

  await supabase
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);

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

    // If user doesn't have a Stripe customer ID, find or create one
    if (!customerId) {
      console.log('[Portal] No stripe_customer_id found for user:', userId);
      customerId = await findOrCreateCustomer(userId, profile.email || '');
    }

    // Try to create the portal session, auto-recover if customer is stale
    try {
      const session = await stripeService.createPortalSession(
        customerId,
        returnUrl || `${env.APP_URL}/dashboard`
      );
      return NextResponse.json({ url: session.url });
    } catch (portalError: any) {
      // If the customer doesn't exist in Stripe, find/create and retry
      if (portalError.type === 'StripeInvalidRequestError' &&
          portalError.message?.includes('No such customer')) {
        console.warn('[Portal] Stale customer ID:', customerId, '- recovering');
        customerId = await findOrCreateCustomer(userId, profile.email || '');

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
