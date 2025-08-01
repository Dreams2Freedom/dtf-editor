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

async function verifyPauseExtension() {
  console.log('Verifying pause extension calculation...\n');

  // Get the user profile
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const authUser = authUsers.users.find(u => u.email === 'snsmarketing@gmail.com');
  
  const { data: user } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (!user || !user.stripe_subscription_id) {
    console.error('User or subscription not found');
    return;
  }

  // Get Stripe subscription
  const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
  
  console.log('=== SUBSCRIPTION DETAILS ===');
  console.log('Status:', subscription.status);
  console.log('Current Period Start:', new Date(subscription.current_period_start * 1000).toLocaleDateString());
  console.log('Current Period End:', new Date(subscription.current_period_end * 1000).toLocaleDateString());
  
  if (subscription.pause_collection) {
    console.log('\n=== PAUSE DETAILS ===');
    console.log('Pause Status: ACTIVE');
    console.log('Resume Date:', new Date(subscription.pause_collection.resumes_at * 1000).toLocaleDateString());
    
    // Calculate the extension
    const currentEnd = new Date(subscription.current_period_end * 1000);
    const resumeDate = new Date(subscription.pause_collection.resumes_at * 1000);
    const extensionDays = Math.round((resumeDate - currentEnd) / (1000 * 60 * 60 * 24));
    
    console.log('\n=== EXTENSION CALCULATION ===');
    console.log('Original Billing End:', currentEnd.toLocaleDateString());
    console.log('New Resume Date:', resumeDate.toLocaleDateString());
    console.log('Extension Days:', extensionDays);
    
    if (extensionDays === 14) {
      console.log('✅ 2-week extension applied correctly');
    } else if (extensionDays >= 28 && extensionDays <= 31) {
      console.log('✅ 1-month extension applied correctly');
    } else if (extensionDays >= 59 && extensionDays <= 62) {
      console.log('✅ 2-month extension applied correctly');
    } else {
      console.log('⚠️  Unexpected extension duration');
    }
    
    // Check database sync
    console.log('\n=== DATABASE SYNC ===');
    console.log('DB Paused Until:', user.subscription_paused_until ? new Date(user.subscription_paused_until).toLocaleDateString() : 'Not set');
    console.log('DB Status:', user.subscription_status);
    
    if (user.subscription_paused_until) {
      const dbResumeDate = new Date(user.subscription_paused_until);
      const dateDiff = Math.abs(dbResumeDate - resumeDate) / (1000 * 60 * 60 * 24);
      if (dateDiff < 1) {
        console.log('✅ Database and Stripe dates match');
      } else {
        console.log('⚠️  Database and Stripe dates differ by', dateDiff, 'days');
      }
    }
  } else {
    console.log('\n❌ Subscription is NOT paused');
  }
  
  // Get latest pause event
  const { data: events } = await supabase
    .from('subscription_events')
    .select('*')
    .eq('user_id', user.id)
    .eq('event_type', 'subscription_paused')
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (events && events.length > 0) {
    console.log('\n=== LATEST PAUSE EVENT ===');
    console.log('Created:', new Date(events[0].created_at).toLocaleString());
    console.log('Duration:', events[0].event_data.duration);
    console.log('Event Resume Date:', new Date(events[0].event_data.resume_date).toLocaleDateString());
  }
}

verifyPauseExtension();