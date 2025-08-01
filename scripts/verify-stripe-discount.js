#!/usr/bin/env node
const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia'
});

async function verifyDiscount() {
  console.log('Checking Stripe subscription for discount...\n');
  
  try {
    const subscriptionId = 'sub_1RqD2HPHFzf1GpIrdlhelKiG';
    const customerId = 'cus_SljqE25ffokLaJ';
    
    // Get the subscription
    console.log('1. Retrieving subscription details...');
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    console.log('\n=== SUBSCRIPTION STATUS ===');
    console.log('Status:', subscription.status);
    console.log('Current period end:', new Date(subscription.current_period_end * 1000).toLocaleDateString());
    
    // Check for active discounts
    console.log('\n=== DISCOUNT STATUS ===');
    if (subscription.discount) {
      console.log('✅ DISCOUNT ACTIVE!');
      console.log('Coupon ID:', subscription.discount.coupon.id);
      console.log('Percent off:', subscription.discount.coupon.percent_off + '%');
      console.log('Duration:', subscription.discount.coupon.duration);
      console.log('Valid:', subscription.discount.coupon.valid);
      
      if (subscription.discount.end) {
        console.log('Discount ends:', new Date(subscription.discount.end * 1000).toLocaleDateString());
      }
    } else {
      console.log('❌ No discount found on subscription');
    }
    
    // Get the next invoice preview
    console.log('\n2. Getting next invoice preview...');
    const upcomingParams = {
      customer: customerId,
      subscription: subscriptionId
    };
    
    // List upcoming invoice lines
    const upcomingLines = await stripe.invoiceItems.list({
      customer: customerId,
      pending: true
    });
    
    console.log('\n=== NEXT BILLING PREVIEW ===');
    console.log('Regular price: $' + (subscription.items.data[0].price.unit_amount / 100));
    
    if (subscription.discount) {
      const regularAmount = subscription.items.data[0].price.unit_amount / 100;
      const discountAmount = regularAmount * (subscription.discount.coupon.percent_off / 100);
      const finalAmount = regularAmount - discountAmount;
      
      console.log('Discount amount: -$' + discountAmount.toFixed(2));
      console.log('Final amount: $' + finalAmount.toFixed(2));
      console.log('\n✅ Your next bill will be 50% off!');
    }
    
    // Check recent invoices
    console.log('\n3. Checking recent invoices...');
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 3
    });
    
    console.log('\n=== RECENT INVOICES ===');
    invoices.data.forEach((invoice, index) => {
      console.log(`\nInvoice ${index + 1}:`);
      console.log('Date:', new Date(invoice.created * 1000).toLocaleDateString());
      console.log('Amount: $' + (invoice.total / 100));
      console.log('Status:', invoice.status);
      
      if (invoice.discount) {
        console.log('Had discount: Yes (' + invoice.discount.coupon.percent_off + '% off)');
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

verifyDiscount();