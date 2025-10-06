const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

async function processSession() {
  const sessionId =
    'cs_test_a1gkSc1SqGe2NeyCHpAmS5bgLXH2KNcgVRlAfGX3IgLaE0DLVg8yoE1H1L';
  const userId = 'f689bb22-89dd-4c3c-a941-d77feb84428d';

  try {
    // Get the session
    const session = await stripeClient.checkout.sessions.retrieve(sessionId);
    console.log('Session:', session.id, session.status);

    // Get the subscription
    const subscription = await stripeClient.subscriptions.retrieve(
      session.subscription
    );
    console.log('Subscription:', subscription.id, subscription.status);

    // Get the price details
    const priceId = subscription.items.data[0].price.id;
    console.log('Price ID:', priceId);

    // Update user profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        stripe_customer_id: session.customer,
        stripe_subscription_id: subscription.id,
        subscription_status: 'basic', // Changed from 'active' to 'basic'
        subscription_plan: 'basic', // Since it's the basic plan
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return;
    }

    console.log('Profile updated successfully');

    // Add credits for Basic plan (20 credits)
    const { error: creditError } = await supabase.rpc('add_user_credits', {
      p_user_id: userId,
      p_amount: 20,
      p_transaction_type: 'subscription',
      p_description: 'Basic plan subscription',
      p_metadata: {
        stripe_session_id: session.id,
        stripe_subscription_id: subscription.id,
        price_paid: 999,
      },
    });

    if (creditError) {
      console.error('Error adding credits:', creditError);
      return;
    }

    console.log('Credits added successfully');
    console.log('✅ Subscription processed successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

processSession();
