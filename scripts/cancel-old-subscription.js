const stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

async function cancelOldSubscription() {
  try {
    // Cancel the old basic subscription
    const oldSubscriptionId = 'sub_1RqDNHPHFzf1GpIrGz5ZRelM';

    const canceledSubscription =
      await stripeClient.subscriptions.cancel(oldSubscriptionId);

    console.log('✅ Cancelled old subscription:', canceledSubscription.id);
    console.log('Status:', canceledSubscription.status);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

cancelOldSubscription();
