import { NextRequest, NextResponse } from 'next/server';
import { getStripeService } from '@/services/stripe';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { withRateLimit } from '@/lib/rate-limit';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

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

    // If user doesn't have a Stripe customer ID, create one
    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      console.log('[Portal] No stripe_customer_id found, creating customer for', userId);
      try {
        const customer = await stripeService.createCustomer(
          profile.email || '',
          undefined
        );
        customerId = customer.id;

        // Save the customer ID to the profile
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', userId);
      } catch (createErr: any) {
        console.error('[Portal] Failed to create Stripe customer:', createErr.message);
        return NextResponse.json(
          { error: 'Unable to set up billing. Please contact support.' },
          { status: 500 }
        );
      }
    }

    // Create billing portal session
    const session = await stripeService.createPortalSession(
      customerId,
      returnUrl || `${env.APP_URL}/dashboard`
    );

    return NextResponse.json({
      url: session.url,
    });
  } catch (error: any) {
    console.error('[Portal] Error creating portal session:', error.message);

    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      if (error.message?.includes('portal configuration')) {
        console.error('[Portal] Billing portal not configured in Stripe Dashboard');
        return NextResponse.json(
          { error: 'Billing portal is not configured. Please contact support.' },
          { status: 500 }
        );
      }
      if (error.message?.includes('No such customer')) {
        // Customer was deleted from Stripe - clear the stale ID
        console.error('[Portal] Stale stripe_customer_id, customer not found in Stripe');
        return NextResponse.json(
          { error: 'Billing account not found. Please contact support.' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'payment');
