import { NextRequest, NextResponse } from 'next/server';
import { getStripeService } from '@/services/stripe';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { env } from '@/config/env';
import { withRateLimit } from '@/lib/rate-limit';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function handlePost(request: NextRequest) {
  try {
    // SEC-004: Authenticate the user server-side
    const authClient = await createServerSupabaseClient();
    const {
      data: { user: authenticatedUser },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !authenticatedUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { priceId } = await request.json();

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    // Use authenticated user's ID, not client-supplied userId
    const userId = authenticatedUser.id;

    // Determine credits from price ID server-side (never trust client)
    let credits = 0;
    if (priceId === env.STRIPE_PAYG_10_CREDITS_PRICE_ID) {
      credits = 10;
    } else if (priceId === env.STRIPE_PAYG_20_CREDITS_PRICE_ID) {
      credits = 20;
    } else if (priceId === env.STRIPE_PAYG_50_CREDITS_PRICE_ID) {
      credits = 50;
    }

    if (credits === 0) {
      return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 });
    }

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const stripeService = getStripeService();

    // Create or get Stripe customer
    let customerId = user.stripe_customer_id;

    if (!customerId) {
      const customer = await stripeService.createCustomer(
        user.email,
        user.full_name || undefined
      );
      customerId = customer.id;

      // Update user with Stripe customer ID
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Get the price from Stripe to get the amount
    const stripe = require('stripe')(env.STRIPE_SECRET_KEY);
    const price = await stripe.prices.retrieve(priceId);

    if (!price) {
      return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 });
    }

    // Create payment intent
    const paymentIntent = await stripeService.createPaymentIntent({
      customerId,
      amount: price.unit_amount || 0,
      currency: price.currency || 'usd',
      metadata: {
        userId,
        userEmail: user.email,
        credits: credits.toString(),
        priceId,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      customerId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'payment');
