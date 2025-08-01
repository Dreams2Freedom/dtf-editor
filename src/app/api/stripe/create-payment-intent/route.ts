import { NextRequest, NextResponse } from 'next/server';
import { getStripeService } from '@/services/stripe';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request: NextRequest) {
  try {
    const { priceId, userId, credits } = await request.json();

    if (!priceId || !userId || !credits) {
      return NextResponse.json(
        { error: 'Price ID, user ID, and credits are required' },
        { status: 400 }
      );
    }

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
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
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      );
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