import { NextRequest, NextResponse } from 'next/server';
import { getStripeService } from '@/services/stripe';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { withRateLimit } from '@/lib/rate-limit';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function handleGet(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const stripeService = getStripeService();
    const session = await stripeService.getCheckoutSession(sessionId);
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get subscription details if it exists
    let subscription = null;
    if (session.subscription) {
      subscription = await stripeService.getSubscription(session.subscription as string);
    }

    return NextResponse.json({
      session: {
        id: session.id,
        status: session.status,
        mode: session.mode,
        payment_status: session.payment_status,
        customer: session.customer,
        subscription: session.subscription,
        metadata: session.metadata,
        amount_total: session.amount_total,
      },
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        items: subscription.items.data.map(item => ({
          price_id: item.price.id,
          product_id: item.price.product,
        })),
        metadata: subscription.metadata,
      } : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to debug session' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'payment');