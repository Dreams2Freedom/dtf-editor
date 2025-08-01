const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

async function updateSubscription() {
  const userId = 'f689bb22-89dd-4c3c-a941-d77feb84428d';
  
  try {
    // Get all subscriptions for the customer
    const subscriptions = await stripeClient.subscriptions.list({
      customer: 'cus_SljqE25ffokLaJ',
      status: 'active',
      limit: 10
    });

    if (subscriptions.data.length === 0) {
      console.log('No active subscriptions found');
      return;
    }

    // Get the most recent subscription (highest amount or newest created)
    const subscription = subscriptions.data.sort((a, b) => 
      b.items.data[0].price.unit_amount - a.items.data[0].price.unit_amount
    )[0];
    console.log('Subscription status:', subscription.status);
    console.log('Price ID:', subscription.items.data[0].price.id);

    // Map price IDs to plan names
    const priceIdToPlan = {
      'price_1RleoYPHFzf1GpIrfy9RVk9m': 'basic',
      'price_1RlepVPHFzf1GpIrjRiKHtvb': 'starter',
      'price_1RleqXPHFzf1GpIrXYXVHNCh': 'professional'
    };

    const priceId = subscription.items.data[0].price.id;
    const planName = priceIdToPlan[priceId] || 'free';

    console.log('Updating to plan:', planName);

    // Update the profile with the new subscription
    const { error } = await supabase
      .from('profiles')
      .update({
        stripe_subscription_id: subscription.id,
        subscription_status: planName,
        subscription_plan: planName,
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating profile:', error);
    } else {
      console.log('✅ Profile updated successfully to', planName);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

updateSubscription();