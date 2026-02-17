/**
 * Backfill payment_transactions from Stripe checkout sessions.
 *
 * Pulls all completed checkout sessions from Stripe, maps them to users
 * via profiles.stripe_customer_id, and inserts into payment_transactions.
 *
 * Safe to run multiple times — uses stripe_checkout_session_id for idempotency.
 *
 * Usage:
 *   node scripts/backfill-payment-transactions.js            # dry-run (default)
 *   node scripts/backfill-payment-transactions.js --commit   # actually insert
 */

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = !process.argv.includes('--commit');

// Plan name mapping from Stripe price IDs to tier names
// We'll detect these from the checkout session metadata and line items
function detectTier(session, lineItems) {
  // Check session metadata first
  if (session.metadata?.plan_name) return session.metadata.plan_name;
  if (session.metadata?.tier) return session.metadata.tier;
  if (session.metadata?.subscription_tier) return session.metadata.subscription_tier;

  // Try to detect from amount
  const amount = session.amount_total; // in cents
  if (session.mode === 'subscription') {
    if (amount <= 999) return 'basic';
    if (amount <= 2999) return 'starter';
    if (amount <= 4999) return 'professional';
    return 'subscription';
  }

  return null;
}

function detectCredits(session) {
  // Check metadata
  if (session.metadata?.credits) return parseInt(session.metadata.credits, 10);
  if (session.metadata?.credits_purchased) return parseInt(session.metadata.credits_purchased, 10);

  // Detect from amount for pay-as-you-go packages
  const amount = session.amount_total; // in cents
  if (session.mode === 'payment') {
    // Common credit package amounts (check your actual pricing)
    if (amount === 499) return 10;
    if (amount === 899) return 20;
    if (amount === 1999) return 50;
  }

  // For subscriptions, detect from plan tier
  if (session.mode === 'subscription') {
    const tier = detectTier(session);
    if (tier === 'basic') return 20;
    if (tier === 'starter') return 60;
    if (tier === 'professional') return 150;
  }

  return null;
}

async function buildCustomerUserMap() {
  console.log('📋 Building customer → user mapping from profiles...');
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, stripe_customer_id')
    .not('stripe_customer_id', 'is', null);

  if (error) {
    console.error('❌ Failed to fetch profiles:', error.message);
    process.exit(1);
  }

  const map = new Map();
  for (const p of profiles) {
    if (p.stripe_customer_id) {
      map.set(p.stripe_customer_id, { userId: p.id, email: p.email });
    }
  }
  console.log(`   Found ${map.size} users with Stripe customer IDs\n`);
  return map;
}

async function getExistingSessionIds() {
  console.log('📋 Checking existing payment_transactions...');
  const { data, error } = await supabase
    .from('payment_transactions')
    .select('stripe_checkout_session_id');

  if (error) {
    console.error('❌ Failed to fetch existing transactions:', error.message);
    return new Set();
  }

  const ids = new Set(data.map(r => r.stripe_checkout_session_id));
  console.log(`   Found ${ids.size} already-recorded sessions\n`);
  return ids;
}

async function fetchAllCheckoutSessions() {
  console.log('🔍 Fetching checkout sessions from Stripe...');
  const sessions = [];
  let hasMore = true;
  let startingAfter = undefined;

  while (hasMore) {
    const params = {
      limit: 100,
      status: 'complete',
      expand: ['data.line_items', 'data.payment_intent'],
    };
    if (startingAfter) params.starting_after = startingAfter;

    const batch = await stripe.checkout.sessions.list(params);
    sessions.push(...batch.data);

    hasMore = batch.has_more;
    if (batch.data.length > 0) {
      startingAfter = batch.data[batch.data.length - 1].id;
    }

    process.stdout.write(`   Fetched ${sessions.length} sessions so far...\r`);
  }

  console.log(`\n   Total completed checkout sessions: ${sessions.length}\n`);
  return sessions;
}

async function backfill() {
  console.log('='.repeat(60));
  console.log(DRY_RUN
    ? '🔍 DRY RUN — no data will be written'
    : '🚀 COMMIT MODE — will insert into payment_transactions');
  console.log('='.repeat(60) + '\n');

  const customerUserMap = await buildCustomerUserMap();
  const existingSessionIds = await getExistingSessionIds();
  const sessions = await fetchAllCheckoutSessions();

  let inserted = 0;
  let skippedDuplicate = 0;
  let skippedNoUser = 0;
  let skippedNoAmount = 0;
  const errors = [];

  for (const session of sessions) {
    // Skip already-recorded
    if (existingSessionIds.has(session.id)) {
      skippedDuplicate++;
      continue;
    }

    // Map customer to user
    const customerId = session.customer;
    const userInfo = customerUserMap.get(customerId);
    if (!userInfo) {
      skippedNoUser++;
      console.log(`   ⚠️  No user found for customer ${customerId} (session ${session.id})`);
      continue;
    }

    // Skip zero-amount sessions
    if (!session.amount_total || session.amount_total === 0) {
      skippedNoAmount++;
      continue;
    }

    const paymentType = session.mode === 'subscription' ? 'subscription' : 'one_time';
    const tier = detectTier(session, session.line_items);
    const credits = detectCredits(session);

    // Get payment intent ID
    let paymentIntentId = null;
    if (session.payment_intent) {
      paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent.id;
    }

    // Get subscription ID
    let subscriptionId = null;
    if (session.subscription) {
      subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription.id;
    }

    const record = {
      user_id: userInfo.userId,
      stripe_payment_intent_id: paymentIntentId,
      stripe_checkout_session_id: session.id,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      amount: session.amount_total / 100, // cents → dollars
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

    console.log(`   💳 ${record.created_at.slice(0, 10)} | $${record.amount.toFixed(2)} | ${paymentType} | ${userInfo.email} | credits: ${credits || 'unknown'} | tier: ${tier || 'n/a'}`);

    if (!DRY_RUN) {
      const { error } = await supabase
        .from('payment_transactions')
        .insert(record);

      if (error) {
        console.error(`   ❌ Insert failed for ${session.id}:`, error.message);
        errors.push({ sessionId: session.id, error: error.message });
      } else {
        inserted++;
      }
    } else {
      inserted++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`   ${DRY_RUN ? 'Would insert' : 'Inserted'}: ${inserted}`);
  console.log(`   Skipped (already exists): ${skippedDuplicate}`);
  console.log(`   Skipped (no matching user): ${skippedNoUser}`);
  console.log(`   Skipped (zero amount): ${skippedNoAmount}`);
  if (errors.length > 0) {
    console.log(`   Errors: ${errors.length}`);
    errors.forEach(e => console.log(`     - ${e.sessionId}: ${e.error}`));
  }

  if (DRY_RUN && inserted > 0) {
    console.log(`\n💡 Run with --commit to actually insert these ${inserted} records:`);
    console.log('   node scripts/backfill-payment-transactions.js --commit');
  }
  console.log();
}

backfill().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
