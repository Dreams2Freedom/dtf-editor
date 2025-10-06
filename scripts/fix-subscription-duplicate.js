#!/usr/bin/env node

/**
 * Fix for BUG-017: Handle subscription updates that create new subscriptions
 * This script ensures proper handling of subscription changes from Stripe Customer Portal
 */

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Check for duplicate active subscriptions for a customer
 */
async function checkDuplicateSubscriptions(customerId) {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 100,
    });

    if (subscriptions.data.length > 1) {
      console.log(
        `⚠️ Customer ${customerId} has ${subscriptions.data.length} active subscriptions:`
      );

      // Sort by created date to find the newest
      const sorted = subscriptions.data.sort((a, b) => b.created - a.created);

      return {
        hasDuplicates: true,
        newest: sorted[0],
        older: sorted.slice(1),
      };
    }

    return {
      hasDuplicates: false,
      newest: subscriptions.data[0],
      older: [],
    };
  } catch (error) {
    console.error('Error checking subscriptions:', error);
    return { hasDuplicates: false, newest: null, older: [] };
  }
}

/**
 * Cancel older duplicate subscriptions
 */
async function cancelOlderSubscriptions(olderSubscriptions) {
  const results = [];

  for (const sub of olderSubscriptions) {
    try {
      console.log(
        `  Cancelling old subscription: ${sub.id} (created: ${new Date(sub.created * 1000).toISOString()})`
      );

      const cancelled = await stripe.subscriptions.cancel(sub.id, {
        prorate: true,
        invoice_now: false,
      });

      results.push({
        id: sub.id,
        status: 'cancelled',
        cancelledAt: cancelled.canceled_at,
      });

      console.log(`  ✅ Cancelled subscription ${sub.id}`);
    } catch (error) {
      console.error(
        `  ❌ Failed to cancel subscription ${sub.id}:`,
        error.message
      );
      results.push({
        id: sub.id,
        status: 'error',
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Update user profile with correct subscription
 */
async function updateUserProfile(userId, subscription) {
  try {
    const priceId = subscription.items.data[0]?.price.id;

    // Map price IDs to plan names
    const planMap = {
      [process.env.STRIPE_BASIC_PLAN_PRICE_ID]: 'basic',
      [process.env.STRIPE_STARTER_PLAN_PRICE_ID]: 'starter',
    };

    const planName = planMap[priceId] || 'free';

    const { error } = await supabase
      .from('profiles')
      .update({
        stripe_subscription_id: subscription.id,
        subscription_plan: planName,
        subscription_status:
          subscription.status === 'active' ? planName : subscription.status,
        subscription_current_period_end: new Date(
          subscription.current_period_end * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw error;
    }

    console.log(
      `✅ Updated user ${userId} with subscription ${subscription.id} (${planName})`
    );
    return true;
  } catch (error) {
    console.error(`❌ Failed to update user profile:`, error);
    return false;
  }
}

/**
 * Main function to fix duplicate subscriptions
 */
async function fixDuplicateSubscriptions() {
  console.log('🔍 Checking for duplicate subscriptions...\n');

  // Get all users with Stripe customer IDs
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select(
      'id, email, stripe_customer_id, stripe_subscription_id, subscription_plan'
    )
    .not('stripe_customer_id', 'is', null);

  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }

  console.log(`Found ${profiles.length} users with Stripe customer IDs\n`);

  let fixedCount = 0;
  let duplicateCount = 0;

  for (const profile of profiles) {
    const { hasDuplicates, newest, older } = await checkDuplicateSubscriptions(
      profile.stripe_customer_id
    );

    if (hasDuplicates) {
      duplicateCount++;
      console.log(`\n🔄 Fixing duplicates for ${profile.email}:`);
      console.log(
        `  Current subscription in DB: ${profile.stripe_subscription_id}`
      );
      console.log(`  Newest subscription in Stripe: ${newest.id}`);
      console.log(`  Will cancel ${older.length} older subscription(s)`);

      // Cancel older subscriptions
      const cancelResults = await cancelOlderSubscriptions(older);

      // Update profile with newest subscription
      if (newest.id !== profile.stripe_subscription_id) {
        const updated = await updateUserProfile(profile.id, newest);
        if (updated) {
          fixedCount++;
        }
      }
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  Total users checked: ${profiles.length}`);
  console.log(`  Users with duplicates: ${duplicateCount}`);
  console.log(`  Profiles updated: ${fixedCount}`);
}

/**
 * Add safeguard to webhook handler
 */
function generateWebhookPatch() {
  console.log('\n📝 Webhook Handler Patch:\n');
  console.log(`
// Add this to handleSubscriptionEvent function in /src/app/api/webhooks/stripe/route.ts

// Before creating/updating subscription, check if customer already has one
if (subscription.customer) {
  // Check for existing active subscriptions
  const existingSubscriptions = await getStripeService().listSubscriptions({
    customer: subscription.customer,
    status: 'active'
  });
  
  // If this is a new subscription and there's already an active one
  if (existingSubscriptions.data.length > 1) {
    // Find the older subscription(s)
    const sorted = existingSubscriptions.data.sort((a, b) => b.created - a.created);
    const older = sorted.slice(1);
    
    // Cancel older subscriptions
    for (const oldSub of older) {
      if (oldSub.id !== subscription.id) {
        console.log('Cancelling duplicate subscription:', oldSub.id);
        await getStripeService().cancelSubscription(oldSub.id);
      }
    }
  }
}
`);
}

// Run the fix
(async () => {
  console.log('🚀 Starting duplicate subscription fix...\n');

  await fixDuplicateSubscriptions();

  generateWebhookPatch();

  console.log('\n✅ Done!');
})();
