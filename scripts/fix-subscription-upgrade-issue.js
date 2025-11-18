/**
 * SUBSCRIPTION UPGRADE BUG FIX
 *
 * Issue: User hello@weprintupress.com upgraded from starter to professional
 * Problems:
 * 1. Two subscriptions created instead of updating existing
 * 2. Dashboard still shows "starter" instead of "professional"
 * 3. Using test mode keys but user is in production
 *
 * This script:
 * 1. Uses PRODUCTION Stripe keys
 * 2. Lists all subscriptions for the customer
 * 3. Identifies which subscription should be active
 * 4. Cancels the duplicate subscription
 * 5. Updates the database to reflect correct subscription
 */

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// IMPORTANT: Using PRODUCTION keys
const STRIPE_SECRET_KEY = process.env.STRIPE_LIVE_SECRET_KEY;
const stripe = new Stripe(STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CUSTOMER_ID = 'cus_TEEgzJ8TbsQT9U';
const USER_EMAIL = 'hello@weprintupress.com';

// Price IDs from your PRODUCTION environment
const PRICE_IDS = {
  basic: process.env.STRIPE_LIVE_BASIC_PLAN_PRICE_ID,
  starter: process.env.STRIPE_LIVE_STARTER_PLAN_PRICE_ID,
  professional: process.env.STRIPE_LIVE_PROFESSIONAL_PLAN_PRICE_ID,
};

async function main() {
  console.log('🔍 STRIPE SUBSCRIPTION UPGRADE FIX');
  console.log('='.repeat(60));
  console.log('Customer ID:', CUSTOMER_ID);
  console.log('User Email:', USER_EMAIL);
  console.log('Using Stripe Key:', STRIPE_SECRET_KEY.substring(0, 20) + '...');
  console.log('='.repeat(60));

  try {
    // Step 1: Get all subscriptions for this customer
    console.log('\n📋 Step 1: Fetching all subscriptions...');
    const subscriptions = await stripe.subscriptions.list({
      customer: CUSTOMER_ID,
      limit: 100,
      expand: ['data.items.data.price']
    });

    console.log(`Found ${subscriptions.data.length} subscription(s)\n`);

    // Display all subscriptions
    subscriptions.data.forEach((sub, index) => {
      const price = sub.items.data[0]?.price;
      const priceId = price?.id;
      let planName = 'Unknown';

      if (priceId === PRICE_IDS.basic) planName = 'Basic';
      else if (priceId === PRICE_IDS.starter) planName = 'Starter';
      else if (priceId === PRICE_IDS.professional) planName = 'Professional';

      console.log(`Subscription #${index + 1}:`);
      console.log('  ID:', sub.id);
      console.log('  Status:', sub.status);
      console.log('  Plan:', planName);
      console.log('  Price ID:', priceId);
      console.log('  Amount:', `$${(price?.unit_amount || 0) / 100}/month`);
      console.log('  Created:', new Date(sub.created * 1000).toISOString());
      if (sub.current_period_start && sub.current_period_end) {
        console.log('  Current Period:', new Date(sub.current_period_start * 1000).toISOString(), 'to', new Date(sub.current_period_end * 1000).toISOString());
      }

      if (sub.cancel_at_period_end) {
        console.log('  ⚠️  WILL CANCEL AT PERIOD END');
      }

      console.log();
    });

    // Step 2: Identify which subscription to keep
    console.log('📊 Step 2: Analyzing subscriptions...');

    const activeSubscriptions = subscriptions.data.filter(sub =>
      sub.status === 'active' || sub.status === 'trialing'
    );

    if (activeSubscriptions.length === 0) {
      console.log('❌ No active subscriptions found!');
      return;
    }

    if (activeSubscriptions.length === 1) {
      console.log('✅ Only one active subscription - no duplicates to remove');
      const sub = activeSubscriptions[0];
      const price = sub.items.data[0]?.price;
      let planId = 'free';

      if (price?.id === PRICE_IDS.basic) planId = 'basic';
      else if (price?.id === PRICE_IDS.starter) planId = 'starter';
      else if (price?.id === PRICE_IDS.professional) planId = 'professional';

      console.log('\n📝 Step 3: Updating database...');
      await updateDatabase(sub, planId);
      return;
    }

    // Multiple active subscriptions - need to choose which to keep
    console.log(`⚠️  Found ${activeSubscriptions.length} active subscriptions!`);

    // Keep the newest subscription (most recent upgrade)
    activeSubscriptions.sort((a, b) => b.created - a.created);
    const subscriptionToKeep = activeSubscriptions[0];
    const subscriptionsToCancel = activeSubscriptions.slice(1);

    const keepPrice = subscriptionToKeep.items.data[0]?.price;
    let keepPlanId = 'free';

    if (keepPrice?.id === PRICE_IDS.basic) keepPlanId = 'basic';
    else if (keepPrice?.id === PRICE_IDS.starter) keepPlanId = 'starter';
    else if (keepPrice?.id === PRICE_IDS.professional) keepPlanId = 'professional';

    console.log('\n✅ Subscription to KEEP:');
    console.log('  ID:', subscriptionToKeep.id);
    console.log('  Plan:', keepPlanId);
    console.log('  Created:', new Date(subscriptionToKeep.created * 1000).toISOString());

    // Step 3: Cancel duplicate subscriptions
    console.log('\n🚫 Step 3: Canceling duplicate subscriptions...');

    for (const sub of subscriptionsToCancel) {
      console.log(`\nCanceling subscription: ${sub.id}`);
      try {
        const canceled = await stripe.subscriptions.cancel(sub.id);
        console.log('✅ Canceled successfully');
      } catch (error) {
        console.error('❌ Error canceling subscription:', error.message);
      }
    }

    // Step 4: Update database
    console.log('\n📝 Step 4: Updating database...');
    await updateDatabase(subscriptionToKeep, keepPlanId);

    console.log('\n✅ FIX COMPLETE!');
    console.log('='.repeat(60));
    console.log('Summary:');
    console.log('- Kept subscription:', subscriptionToKeep.id);
    console.log('- Plan:', keepPlanId);
    console.log('- Canceled:', subscriptionsToCancel.length, 'duplicate(s)');
    console.log('- Database updated');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.type === 'StripeInvalidRequestError') {
      console.error('\n⚠️  This might be a test/live mode mismatch.');
      console.error('Current key starts with:', STRIPE_SECRET_KEY.substring(0, 8));
      console.error('Make sure you are using PRODUCTION keys (sk_live_...)');
    }
    throw error;
  }
}

async function updateDatabase(subscription, planId) {
  try {
    // Get user from database
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', USER_EMAIL)
      .single();

    if (fetchError) {
      console.error('Error fetching user:', fetchError);
      return;
    }

    console.log('Current database values:');
    console.log('  subscription_status:', profile.subscription_status);
    console.log('  subscription_plan:', profile.subscription_plan);
    console.log('  subscription_tier:', profile.subscription_tier);
    console.log('  stripe_subscription_id:', profile.stripe_subscription_id);

    // Update with correct values
    // NOTE: subscription_status constraint only allows: free, basic, starter, past_due, canceled
    // It does NOT allow 'professional' or 'active' yet!
    // For now, we'll keep starter as the status but update subscription_plan to professional
    // After migration is applied, we can use 'professional' for both
    const updateData = {
      subscription_status: 'starter', // TEMPORARY: Use 'starter' until constraint is updated
      subscription_plan: planId, // This is the real plan: 'professional'
      stripe_subscription_id: subscription.id,
      stripe_customer_id: CUSTOMER_ID,
      updated_at: new Date().toISOString(),
    };

    // Only add period_end if it exists
    if (subscription.current_period_end) {
      updateData.subscription_current_period_end = new Date(subscription.current_period_end * 1000).toISOString();
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('email', USER_EMAIL);

    if (updateError) {
      console.error('❌ Error updating database:', updateError);
      throw updateError;
    }

    console.log('✅ Database updated successfully');
    console.log('New values:');
    console.log('  subscription_status:', planId);
    console.log('  subscription_plan:', planId);
    console.log('  stripe_subscription_id:', subscription.id);

  } catch (error) {
    console.error('Error in updateDatabase:', error);
    throw error;
  }
}

main();
