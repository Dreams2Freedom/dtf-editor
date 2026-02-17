import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service';
import { getStripe } from '@/lib/stripe';
import { withRateLimit } from '@/lib/rate-limit';
import type Stripe from 'stripe';

function detectTier(
  session: Stripe.Checkout.Session
): string | null {
  const meta = session.metadata || {};
  if (meta.plan_name) return meta.plan_name;
  if (meta.tier) return meta.tier;
  if (meta.subscription_tier) return meta.subscription_tier;

  const amount = session.amount_total || 0;
  if (session.mode === 'subscription') {
    if (amount <= 999) return 'basic';
    if (amount <= 2999) return 'starter';
    if (amount <= 4999) return 'professional';
    return 'subscription';
  }
  return null;
}

function detectCredits(session: Stripe.Checkout.Session): number | null {
  const meta = session.metadata || {};
  if (meta.credits) return parseInt(meta.credits, 10);
  if (meta.credits_purchased) return parseInt(meta.credits_purchased, 10);

  const amount = session.amount_total || 0;
  if (session.mode === 'payment') {
    if (amount === 499) return 10;
    if (amount === 899) return 20;
    if (amount === 1999) return 50;
  }
  if (session.mode === 'subscription') {
    const tier = detectTier(session);
    if (tier === 'basic') return 20;
    if (tier === 'starter') return 60;
    if (tier === 'professional') return 150;
  }
  return null;
}

async function handlePost(request: NextRequest) {
  try {
    // Admin auth check
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // default to dry run

    const serviceClient = createServiceRoleSupabaseClient();
    const stripe = getStripe();

    // 1. Build customer → user mapping
    const { data: profiles, error: profilesError } = await serviceClient
      .from('profiles')
      .select('id, email, stripe_customer_id')
      .not('stripe_customer_id', 'is', null);

    if (profilesError) {
      return NextResponse.json(
        { error: 'Failed to fetch profiles', details: profilesError.message },
        { status: 500 }
      );
    }

    const customerUserMap = new Map<
      string,
      { userId: string; email: string }
    >();
    for (const p of profiles || []) {
      if (p.stripe_customer_id) {
        customerUserMap.set(p.stripe_customer_id, {
          userId: p.id,
          email: p.email,
        });
      }
    }

    // 2. Get existing session IDs to skip duplicates
    const { data: existingTxns } = await serviceClient
      .from('payment_transactions')
      .select('stripe_checkout_session_id');

    const existingSessionIds = new Set(
      (existingTxns || []).map(
        (r: { stripe_checkout_session_id: string }) =>
          r.stripe_checkout_session_id
      )
    );

    // 3. Fetch all completed checkout sessions from Stripe
    const sessions: Stripe.Checkout.Session[] = [];
    let hasMore = true;
    let startingAfter: string | undefined = undefined;

    while (hasMore) {
      const params: Stripe.Checkout.SessionListParams = {
        limit: 100,
        status: 'complete',
      };
      if (startingAfter) params.starting_after = startingAfter;

      const batch = await stripe.checkout.sessions.list(params);
      sessions.push(...batch.data);
      hasMore = batch.has_more;
      if (batch.data.length > 0) {
        startingAfter = batch.data[batch.data.length - 1].id;
      }
    }

    // 4. Process and insert
    let inserted = 0;
    let skippedDuplicate = 0;
    let skippedNoUser = 0;
    let skippedNoAmount = 0;
    const errors: Array<{ sessionId: string; error: string; code?: string; details?: string }> = [];
    const preview: Array<Record<string, unknown>> = [];

    for (const session of sessions) {
      if (existingSessionIds.has(session.id)) {
        skippedDuplicate++;
        continue;
      }

      const customerId =
        typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id;
      if (!customerId) {
        skippedNoUser++;
        continue;
      }

      const userInfo = customerUserMap.get(customerId);
      if (!userInfo) {
        skippedNoUser++;
        continue;
      }

      if (!session.amount_total || session.amount_total === 0) {
        skippedNoAmount++;
        continue;
      }

      const paymentType =
        session.mode === 'subscription' ? 'subscription' : 'one_time';
      const tier = detectTier(session);
      const credits = detectCredits(session);

      let paymentIntentId: string | null = null;
      if (session.payment_intent) {
        paymentIntentId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent.id;
      }

      let subscriptionId: string | null = null;
      if (session.subscription) {
        subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id;
      }

      const record = {
        user_id: userInfo.userId,
        stripe_payment_intent_id: paymentIntentId,
        stripe_checkout_session_id: session.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        amount: session.amount_total / 100,
        currency: session.currency || 'usd',
        payment_type: paymentType,
        status: 'completed',
        credits_purchased: credits,
        subscription_tier: tier,
        metadata: {
          backfilled: true,
          backfill_date: new Date().toISOString(),
          stripe_created: new Date(session.created * 1000).toISOString(),
          original_metadata: session.metadata || {},
        },
        created_at: new Date(session.created * 1000).toISOString(),
      };

      preview.push({
        date: record.created_at.slice(0, 10),
        amount: `$${record.amount.toFixed(2)}`,
        type: paymentType,
        email: userInfo.email,
        credits,
        tier,
        session_id: session.id,
      });

      if (!dryRun) {
        const { error: insertError } = await serviceClient
          .from('payment_transactions')
          .insert(record);

        if (insertError) {
          console.error(
            `Backfill insert failed for ${session.id}:`,
            insertError.message,
            insertError.code,
            insertError.details,
            JSON.stringify(record)
          );
          errors.push({
            sessionId: session.id,
            error: insertError.message,
            code: insertError.code,
            details: insertError.details,
          });
        } else {
          inserted++;
        }
      } else {
        inserted++;
      }
    }

    return NextResponse.json({
      dryRun,
      summary: {
        totalStripeCheckouts: sessions.length,
        usersWithStripeIds: customerUserMap.size,
        wouldInsert: dryRun ? inserted : undefined,
        inserted: dryRun ? undefined : inserted,
        skippedDuplicate,
        skippedNoUser,
        skippedNoAmount,
        errors: errors.length,
      },
      preview: preview.slice(0, 50), // limit preview to 50 rows
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Backfill error:', error);
    return NextResponse.json(
      {
        error: 'Backfill failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handlePost, 'admin');
