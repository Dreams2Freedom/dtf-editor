import { NextRequest, NextResponse } from 'next/server';
import { getStripeService } from '@/services/stripe';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { withRateLimit } from '@/lib/rate-limit';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function handlePost(request: NextRequest) {
  try {
    const { priceId, userId, mode = 'subscription' } = await request.json();

    if (!priceId || !userId) {
      return NextResponse.json(
        { error: 'Price ID and user ID are required' },
        { status: 400 }
      );
    }

    // Get user profile from database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Get user email from auth
    const {
      data: { user: authUser },
    } = await supabase.auth.admin.getUserById(userId);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Auth user not found' },
        { status: 404 }
      );
    }

    const stripeService = getStripeService();

    // Create or get Stripe customer
    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      const customer = await stripeService.createCustomer(
        authUser.email!,
        profile.first_name
          ? `${profile.first_name} ${profile.last_name || ''}`.trim()
          : undefined
      );
      customerId = customer.id;

      // Update profile with Stripe customer ID
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Determine success URL based on mode
    const successUrl =
      mode === 'subscription'
        ? `${env.APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}&subscription_success=true`
        : `${env.APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}&payment_success=true`;

    // Create checkout session configuration
    const sessionConfig: any = {
      customer: customerId,
      success_url: successUrl,
      cancel_url: `${env.APP_URL}/pricing?canceled=true`,
      mode: mode,
      billing_address_collection: 'auto',
      metadata: {
        userId,
        userEmail: authUser.email!,
      },
    };

    if (mode === 'subscription') {
      // Subscription mode
      sessionConfig.line_items = [
        {
          price: priceId,
          quantity: 1,
        },
      ];
      sessionConfig.subscription_data = {
        metadata: {
          userId,
          userEmail: authUser.email!,
        },
      };
    } else {
      // Payment mode for one-time purchases
      // Get the product details to add credits to metadata
      const price = await stripeService.getPrice(priceId);
      let credits = 0;

      // Extract credits from price metadata or ID
      if (priceId === env.STRIPE_PAYG_10_CREDITS_PRICE_ID) {
        credits = 10;
      } else if (priceId === env.STRIPE_PAYG_20_CREDITS_PRICE_ID) {
        credits = 20;
      } else if (priceId === env.STRIPE_PAYG_50_CREDITS_PRICE_ID) {
        credits = 50;
      }

      // Add credits to session metadata too
      sessionConfig.metadata.credits = credits.toString();

      sessionConfig.line_items = [
        {
          price: priceId,
          quantity: 1,
        },
      ];
      sessionConfig.payment_intent_data = {
        metadata: {
          userId,
          userEmail: authUser.email!,
          credits: credits.toString(),
        },
      };
    }

    // Create the checkout session
    const session = await stripeService.createCheckoutSession(sessionConfig);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'payment');
