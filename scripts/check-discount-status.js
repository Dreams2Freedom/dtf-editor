#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDiscountStatus() {
  console.log('Checking discount status...\n');

  // Get the user
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const authUser = authUsers.users.find(u => u.email === 'snsmarketing@gmail.com');
  
  if (!authUser) {
    console.error('User not found');
    return;
  }

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();

  console.log('=== DISCOUNT STATUS ===');
  console.log('Discount Used Count:', profile.discount_used_count || 0);
  console.log('Last Discount Date:', profile.last_discount_date || 'Never');
  console.log('Stripe Customer ID:', profile.stripe_customer_id);
  console.log('Stripe Subscription ID:', profile.stripe_subscription_id);
  
  // Check subscription events
  const { data: discountEvents } = await supabase
    .from('subscription_events')
    .select('*')
    .eq('user_id', authUser.id)
    .eq('event_type', 'discount_used')
    .order('created_at', { ascending: false })
    .limit(1);

  if (discountEvents && discountEvents.length > 0) {
    console.log('\n=== LAST DISCOUNT EVENT ===');
    console.log('Applied at:', discountEvents[0].created_at);
    console.log('Event data:', JSON.stringify(discountEvents[0].event_data, null, 2));
  }

  // Check Stripe for active coupons
  if (profile.stripe_subscription_id) {
    console.log('\n=== CHECKING STRIPE SUBSCRIPTION ===');
    try {
      const Stripe = require('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      
      const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
      
      if (subscription.discount) {
        console.log('Active Discount Found!');
        console.log('Coupon:', subscription.discount.coupon.id);
        console.log('Percent Off:', subscription.discount.coupon.percent_off + '%');
        console.log('Valid:', subscription.discount.coupon.valid);
        console.log('Duration:', subscription.discount.coupon.duration);
      } else {
        console.log('No active discount on subscription');
      }
      
      console.log('\nNext billing amount: $' + (subscription.items.data[0].price.unit_amount / 100));
      console.log('Next billing date:', new Date(subscription.current_period_end * 1000).toLocaleDateString());
    } catch (error) {
      console.error('Error checking Stripe:', error.message);
    }
  }
}

checkDiscountStatus();