import { NextRequest, NextResponse } from 'next/server';
import { getStripeService } from '@/services/stripe';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request: NextRequest) {
  try {
    const { priceId, userId } = await request.json();

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
    const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);
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
        profile.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : undefined
      );
      customerId = customer.id;
      
      // Update profile with Stripe customer ID
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Create subscription
    const subscription = await stripeService.createSubscription({
      customerId,
      priceId,
      metadata: {
        userId,
        userEmail: authUser.email!,
      },
    });

    // Get the client secret from the payment intent
    const clientSecret = (subscription.latest_invoice as any)?.payment_intent?.client_secret;

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret,
      customerId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription' },
      { status: 500 }
    );
  }
} 