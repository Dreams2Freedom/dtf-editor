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

async function testRetentionDiscount() {
  console.log('Testing retention discount functionality...\n');

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

  console.log('=== USER STATUS ===');
  console.log('Email:', user.email);
  console.log('Subscription Status:', user.subscription_status);
  console.log('Discount Count:', user.discount_count || 0);
  console.log('Last Discount Date:', user.last_discount_date || 'Never');

  // Check discount eligibility
  console.log('\n=== CHECKING DISCOUNT ELIGIBILITY ===');
  const { data: eligibility, error: eligError } = await supabase
    .rpc('check_discount_eligibility', { p_user_id: user.id });

  if (eligError) {
    console.error('Error checking eligibility:', eligError);
  } else {
    console.log('Can Use Discount:', eligibility?.can_use_discount || false);
    console.log('Reason:', eligibility?.reason || 'N/A');
    console.log('Discount Used Count:', eligibility?.discount_used_count || 0);
  }

  // Check for discount events
  console.log('\n=== DISCOUNT HISTORY ===');
  const { data: discountEvents } = await supabase
    .from('subscription_events')
    .select('*')
    .eq('user_id', user.id)
    .in('event_type', ['discount_offered', 'discount_used'])
    .order('created_at', { ascending: false });

  if (discountEvents && discountEvents.length > 0) {
    discountEvents.forEach(event => {
      console.log(`\nEvent: ${event.event_type}`);
      console.log('Date:', new Date(event.created_at).toLocaleString());
      console.log('Data:', JSON.stringify(event.event_data, null, 2));
    });
  } else {
    console.log('No discount events found');
  }

  // Check Stripe for active coupons
  if (user.stripe_customer_id) {
    console.log('\n=== STRIPE CUSTOMER COUPONS ===');
    try {
      const customer = await stripe.customers.retrieve(user.stripe_customer_id);
      
      if (customer.discount) {
        console.log('Active Discount:', customer.discount.coupon.name || customer.discount.coupon.id);
        console.log('Percent Off:', customer.discount.coupon.percent_off + '%');
        console.log('Valid:', customer.discount.coupon.valid);
        
        if (customer.discount.end) {
          console.log('Expires:', new Date(customer.discount.end * 1000).toLocaleString());
        }
      } else {
        console.log('No active discounts on customer');
      }

      // Check subscription for discounts
      if (user.stripe_subscription_id) {
        const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
        
        if (subscription.discount) {
          console.log('\n=== SUBSCRIPTION DISCOUNT ===');
          console.log('Coupon:', subscription.discount.coupon.name || subscription.discount.coupon.id);
          console.log('Percent Off:', subscription.discount.coupon.percent_off + '%');
        }
      }
    } catch (stripeErr) {
      console.error('Stripe Error:', stripeErr.message);
    }
  }

  console.log('\n=== SUMMARY ===');
  if (eligibility?.can_use_discount) {
    console.log('✅ User is eligible for retention discount');
  } else {
    console.log('❌ User is not eligible for retention discount');
    console.log('Reason:', eligibility?.reason || 'Unknown');
  }
}

testRetentionDiscount();