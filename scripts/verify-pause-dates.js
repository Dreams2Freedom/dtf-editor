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

async function verifyPauseDates() {
  console.log('Verifying pause date calculations...\n');

  // Get the user
  const { data: user, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'snsmarketing@gmail.com')
    .single();

  if (error || !user) {
    console.error('User not found');
    return;
  }

  // Get the latest pause event
  const { data: events } = await supabase
    .from('subscription_events')
    .select('*')
    .eq('user_id', user.id)
    .eq('event_type', 'subscription_paused')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!events || events.length === 0) {
    console.log('No pause events found');
    return;
  }

  const pauseEvent = events[0];
  const eventData = pauseEvent.event_data;

  console.log('=== PAUSE EVENT DATA ===');
  console.log('Pause Duration:', eventData.duration);
  console.log('Pause Date:', new Date(eventData.pause_date).toLocaleString());
  console.log(
    'Resume Date (from event):',
    new Date(eventData.resume_date).toLocaleString()
  );

  // Get Stripe subscription
  if (user.stripe_subscription_id) {
    try {
      const subscription = await stripe.subscriptions.retrieve(
        user.stripe_subscription_id
      );

      console.log('\n=== STRIPE SUBSCRIPTION ===');
      console.log(
        'Current Period Start:',
        new Date(subscription.current_period_start * 1000).toLocaleString()
      );
      console.log(
        'Current Period End:',
        new Date(subscription.current_period_end * 1000).toLocaleString()
      );

      if (subscription.pause_collection) {
        console.log('\n=== PAUSE DETAILS ===');
        const resumeDate = new Date(
          subscription.pause_collection.resumes_at * 1000
        );
        const currentPeriodEnd = new Date(
          subscription.current_period_end * 1000
        );

        console.log('Stripe Resume Date:', resumeDate.toLocaleString());
        console.log('Original Billing End:', currentPeriodEnd.toLocaleString());

        // Calculate the difference
        const pauseDays = Math.round(
          (resumeDate - currentPeriodEnd) / (1000 * 60 * 60 * 24)
        );
        console.log('\n=== CALCULATION VERIFICATION ===');
        console.log('Days added to billing cycle:', pauseDays);

        // Verify based on duration
        let expectedDays = 0;
        switch (eventData.duration) {
          case '2_weeks':
            expectedDays = 14;
            break;
          case '1_month':
            expectedDays = 30;
            break;
          case '2_months':
            expectedDays = 60;
            break;
        }

        console.log(
          'Expected days for',
          eventData.duration + ':',
          expectedDays
        );

        // The pause might have been applied to an earlier period end date
        // Let's check if the resume date is correct relative to when it was paused
        const pauseDate = new Date(eventData.pause_date);
        const daysSincePause = Math.round(
          (resumeDate - pauseDate) / (1000 * 60 * 60 * 24)
        );

        console.log('\n=== ALTERNATIVE CALCULATION ===');
        console.log('Days from pause date to resume:', daysSincePause);
        console.log(
          'This suggests the pause was applied from a date around:',
          new Date(
            resumeDate.getTime() - expectedDays * 24 * 60 * 60 * 1000
          ).toLocaleDateString()
        );

        if (Math.abs(pauseDays - expectedDays) > 2) {
          console.log(
            '\n⚠️  WARNING: Pause duration may not match expected value'
          );
          console.log(
            'This could be because the subscription period end changed after the pause was applied'
          );
        } else {
          console.log('\n✅ Pause duration appears correct!');
        }
      }
    } catch (stripeErr) {
      console.error('\nStripe Error:', stripeErr.message);
    }
  }

  console.log('\n=== DATABASE VS STRIPE ===');
  console.log(
    'DB Resume Date:',
    user.subscription_paused_until
      ? new Date(user.subscription_paused_until).toLocaleString()
      : 'Not set'
  );
  console.log('Note: Database and Stripe dates should match');
}

verifyPauseDates();
