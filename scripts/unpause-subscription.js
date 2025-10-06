#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

async function unpauseSubscription() {
  console.log('Unpausing subscription for snsmarketing@gmail.com...\n');

  // First get the auth user
  const { data: authUsers, error: authError } =
    await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('Error fetching auth users:', authError);
    return;
  }

  const authUser = authUsers.users.find(
    u => u.email === 'snsmarketing@gmail.com'
  );
  if (!authUser) {
    console.error('Auth user not found');
    return;
  }

  // Get the profile
  const { data: user, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (error || !user) {
    console.error('Profile not found:', error);
    return;
  }

  if (!user.stripe_subscription_id) {
    console.error('No subscription ID found');
    return;
  }

  try {
    // Remove pause from Stripe subscription
    console.log('Removing pause from Stripe subscription...');
    const subscription = await stripe.subscriptions.update(
      user.stripe_subscription_id,
      {
        pause_collection: null,
      }
    );

    console.log('✅ Stripe subscription unpaused');
    console.log('Status:', subscription.status);
    console.log(
      'Current Period End:',
      new Date(subscription.current_period_end * 1000).toLocaleString()
    );

    // Update database
    console.log('\nUpdating database...');
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_paused_until: null,
        subscription_status: 'starter', // or whatever the active status should be
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
    } else {
      console.log('✅ Database updated');
    }

    // Log the unpause event
    await supabase.from('subscription_events').insert({
      user_id: user.id,
      event_type: 'subscription_resumed',
      event_data: {
        resumed_date: new Date().toISOString(),
        stripe_subscription_id: user.stripe_subscription_id,
      },
    });

    console.log('\n✅ Subscription successfully unpaused!');
    console.log('The user can now test the pause feature again.');
  } catch (stripeErr) {
    console.error('Stripe Error:', stripeErr.message);
  }
}

unpauseSubscription();
