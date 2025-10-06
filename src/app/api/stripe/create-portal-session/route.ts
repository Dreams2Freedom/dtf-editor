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
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile || !profile.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found for this user' },
        { status: 404 }
      );
    }

    const stripeService = getStripeService();

    // Create billing portal session
    const session = await stripeService.createPortalSession(
      profile.stripe_customer_id,
      returnUrl || `${env.APP_URL}/dashboard`
    );

    return NextResponse.json({
      url: session.url,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'payment');
