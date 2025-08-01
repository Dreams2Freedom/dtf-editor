#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia'
});

async function checkPauseStatus() {
  console.log('Checking subscription pause status...\n');

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

  console.log('=== DATABASE STATUS ===');
  console.log('User:', user.email);
  console.log('Subscription Status:', user.subscription_status);
  console.log('Paused Until:', user.subscription_paused_until || 'Not paused');
  console.log('Pause Count:', user.pause_count || 0);
  console.log('Last Pause Date:', user.last_pause_date || 'Never');

  // Check subscription events
  const { data: events } = await supabase
    .from('subscription_events')
    .select('*')
    .eq('user_id', user.id)
    .eq('event_type', 'subscription_paused')
    .order('created_at', { ascending: false })
    .limit(1);

  if (events && events.length > 0) {
    console.log('\n=== PAUSE EVENT ===');
    console.log('Event Created:', new Date(events[0].created_at).toLocaleString());
    console.log('Event Data:', JSON.stringify(events[0].event_data, null, 2));
  }

  // Check Stripe subscription
  if (user.stripe_subscription_id) {
    try {
      console.log('\n=== STRIPE STATUS ===');
      const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
      
      console.log('Subscription ID:', subscription.id);
      console.log('Status:', subscription.status);
      console.log('Current Period End:', new Date(subscription.current_period_end * 1000).toLocaleString());
      
      if (subscription.pause_collection) {
        console.log('\n🟢 SUBSCRIPTION IS PAUSED!');
        console.log('Pause Behavior:', subscription.pause_collection.behavior);
        console.log('Resumes At:', new Date(subscription.pause_collection.resumes_at * 1000).toLocaleString());
      } else {
        console.log('\n🔴 SUBSCRIPTION IS NOT PAUSED IN STRIPE');
      }
      
      // Show upcoming invoice
      try {
        const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
          customer: user.stripe_customer_id
        });
        console.log('\n=== NEXT INVOICE ===');
        console.log('Next Billing Date:', new Date(upcomingInvoice.period_end * 1000).toLocaleString());
        console.log('Amount Due:', '$' + (upcomingInvoice.amount_due / 100).toFixed(2));
      } catch (invoiceErr) {
        console.log('\nNo upcoming invoice (subscription might be paused)');
      }
      
    } catch (stripeErr) {
      console.error('\nStripe Error:', stripeErr.message);
    }
  }

  console.log('\n=== SUMMARY ===');
  if (user.subscription_paused_until) {
    const resumeDate = new Date(user.subscription_paused_until);
    const now = new Date();
    const daysUntilResume = Math.ceil((resumeDate - now) / (1000 * 60 * 60 * 24));
    
    console.log(`✅ Subscription is paused and will resume in ${daysUntilResume} days`);
    console.log(`Resume Date: ${resumeDate.toLocaleDateString()}`);
  } else {
    console.log('❌ Subscription pause not reflected in database');
  }
}

checkPauseStatus();