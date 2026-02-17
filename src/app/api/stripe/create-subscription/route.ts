import { NextRequest, NextResponse } from 'next/server';
import { getStripeService } from '@/services/stripe';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { env } from '@/config/env';
import { withRateLimit } from '@/lib/rate-limit';

const serviceClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function handlePost(request: NextRequest) {
  try {
    // NEW-01: Authenticate the request — verify the caller is logged in
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: authedUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authedUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { priceId, userId } = await request.json();

    if (!priceId || !userId) {
      return NextResponse.json(
        { error: 'Price ID and user ID are required' },
        { status: 400 }
      );
    }

    // NEW-01: Verify the authenticated user matches the requested userId
    if (authedUser.id !== userId) {
      return NextResponse.json(
        { error: 'Cannot create subscription for another user' },
        { status: 403 }
      );
    }

    // Get user profile from database (use service client for RLS bypass)
    const { data: profile, error: profileError } = await serviceClient
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
    } = await serviceClient.auth.admin.getUserById(userId);
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
      await serviceClient
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
    const clientSecret = (subscription.latest_invoice as any)?.payment_intent
      ?.client_secret;

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret,
      customerId,
    });
  } catch (error: any) {
    console.error('Subscription creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'payment');
