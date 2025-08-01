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

async function verifyDiscountApplied() {
  console.log('Verifying discount application...\n');

  // Get the user
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const authUser = authUsers.users.find(u => u.email === 'snsmarketing@gmail.com');
  
  const { data: user } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (!user) {
    console.error('User not found');
    return;
  }

  console.log('=== DATABASE STATUS ===');
  console.log('Discount Count:', user.discount_count || 0);
  console.log('Last Discount Date:', user.last_discount_date || 'Never');

  // Check for discount events
  const { data: discountEvents } = await supabase
    .from('subscription_events')
    .select('*')
    .eq('user_id', user.id)
    .in('event_type', ['discount_offered', 'discount_used'])
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\n=== DISCOUNT EVENTS ===');
  if (discountEvents && discountEvents.length > 0) {
    discountEvents.forEach(event => {
      console.log(`\nEvent: ${event.event_type}`);
      console.log('Date:', new Date(event.created_at).toLocaleString());
      if (event.event_data) {
        console.log('Discount:', event.event_data.discount_percent + '%');
        if (event.event_data.coupon_id) {
          console.log('Coupon ID:', event.event_data.coupon_id);
        }
      }
    });
  } else {
    console.log('No discount events found');
  }

  // Check Stripe for active discounts
  if (user.stripe_customer_id) {
    console.log('\n=== STRIPE DISCOUNT STATUS ===');
    
    try {
      // Check customer
      const customer = await stripe.customers.retrieve(user.stripe_customer_id);
      
      if (customer.discount) {
        console.log('\n✅ CUSTOMER HAS ACTIVE DISCOUNT!');
        console.log('Coupon ID:', customer.discount.coupon.id);
        console.log('Percent Off:', customer.discount.coupon.percent_off + '%');
        console.log('Duration:', customer.discount.coupon.duration);
        console.log('Valid:', customer.discount.coupon.valid);
        
        if (customer.discount.end) {
          console.log('Expires:', new Date(customer.discount.end * 1000).toLocaleString());
        }
      } else {
        console.log('No discount on customer object');
      }

      // Check subscription
      if (user.stripe_subscription_id) {
        const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
        
        console.log('\n=== SUBSCRIPTION STATUS ===');
        console.log('Subscription ID:', subscription.id);
        console.log('Status:', subscription.status);
        console.log('Current Period End:', new Date(subscription.current_period_end * 1000).toLocaleDateString());
        
        if (subscription.discount) {
          console.log('\n✅ SUBSCRIPTION HAS DISCOUNT!');
          console.log('Coupon:', subscription.discount.coupon.id);
          console.log('Percent Off:', subscription.discount.coupon.percent_off + '%');
          console.log('Duration:', subscription.discount.coupon.duration);
          
          if (subscription.discount.end) {
            console.log('Discount ends:', new Date(subscription.discount.end * 1000).toLocaleDateString());
          }
        }

        // Get upcoming invoice to see the discount effect
        try {
          const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
            customer: user.stripe_customer_id
          });
          
          console.log('\n=== NEXT INVOICE PREVIEW ===');
          console.log('Next Billing Date:', new Date(upcomingInvoice.period_end * 1000).toLocaleDateString());
          console.log('Subtotal:', '$' + (upcomingInvoice.subtotal / 100).toFixed(2));
          
          if (upcomingInvoice.total_discount_amounts && upcomingInvoice.total_discount_amounts.length > 0) {
            const totalDiscount = upcomingInvoice.total_discount_amounts.reduce((sum, d) => sum + d.amount, 0);
            console.log('Discount:', '-$' + (totalDiscount / 100).toFixed(2));
          }
          
          console.log('Total:', '$' + (upcomingInvoice.total / 100).toFixed(2));
          
          // Check if discount is applied
          if (upcomingInvoice.discount) {
            console.log('\n✅ Discount will be applied to next invoice!');
          }
        } catch (invoiceErr) {
          console.log('\nCould not retrieve upcoming invoice');
        }
      }
      
      // List all coupons on the subscription
      if (user.stripe_subscription_id) {
        console.log('\n=== ALL SUBSCRIPTION DISCOUNTS ===');
        const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id, {
          expand: ['discounts']
        });
        
        if (subscription.discounts && subscription.discounts.length > 0) {
          subscription.discounts.forEach((discount, idx) => {
            console.log(`\nDiscount ${idx + 1}:`);
            console.log('Coupon:', discount.coupon.id);
            console.log('Percent Off:', discount.coupon.percent_off + '%');
          });
        } else {
          console.log('No discounts array on subscription');
        }
      }
      
    } catch (stripeErr) {
      console.error('Stripe Error:', stripeErr.message);
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log('The 50% discount should be applied to the subscription');
  console.log('It should only apply to the next billing cycle (one time)');
  console.log('Check the Stripe dashboard for confirmation');
}

verifyDiscountApplied();