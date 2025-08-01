#!/usr/bin/env node
const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia'
});

async function testDiscountApplication() {
  console.log('Testing Stripe discount application...\n');
  
  try {
    // Test creating a coupon
    console.log('1. Creating test coupon...');
    const coupon = await stripe.coupons.create({
      percent_off: 50,
      duration: 'once',
      max_redemptions: 1,
      metadata: {
        type: 'retention_test',
        created_at: new Date().toISOString()
      }
    });
    console.log('✓ Coupon created:', coupon.id);
    
    // Get the test subscription
    const subscriptionId = 'sub_1RqD2HPHFzf1GpIrdlhelKiG';
    console.log('\n2. Retrieving subscription:', subscriptionId);
    
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    console.log('✓ Subscription found');
    console.log('  Customer:', subscription.customer);
    console.log('  Status:', subscription.status);
    console.log('  Current period end:', new Date(subscription.current_period_end * 1000).toLocaleDateString());
    
    // Try to apply the coupon
    console.log('\n3. Applying coupon to subscription...');
    const updatedSubscription = await stripe.subscriptions.update(
      subscriptionId,
      {
        coupon: coupon.id
      }
    );
    console.log('✓ Coupon applied successfully!');
    
    // Check upcoming invoice
    console.log('\n4. Checking upcoming invoice...');
    const upcomingInvoice = await stripe.invoices.upcoming({
      customer: subscription.customer
    });
    
    console.log('✓ Upcoming invoice retrieved');
    console.log('  Subtotal: $' + (upcomingInvoice.subtotal / 100));
    console.log('  Discount: $' + ((upcomingInvoice.discount?.coupon?.percent_off || 0) * upcomingInvoice.subtotal / 10000));
    console.log('  Total: $' + (upcomingInvoice.total / 100));
    
    // Clean up - remove the discount
    console.log('\n5. Cleaning up - removing discount...');
    await stripe.subscriptions.update(subscriptionId, {
      coupon: ''
    });
    console.log('✓ Discount removed');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.type) {
      console.error('  Type:', error.type);
    }
    if (error.code) {
      console.error('  Code:', error.code);
    }
  }
}

testDiscountApplication();