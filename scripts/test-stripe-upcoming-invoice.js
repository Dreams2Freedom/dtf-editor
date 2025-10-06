#!/usr/bin/env node
const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

async function testUpcomingInvoice() {
  console.log('Testing Stripe upcoming invoice methods...\n');

  try {
    const customerId = 'cus_SljqE25ffokLaJ';

    console.log('Available invoice methods:');
    console.log(
      '- stripe.invoices:',
      Object.keys(stripe.invoices).filter(k => !k.startsWith('_'))
    );

    // Try different methods
    console.log('\nTrying retrieveUpcoming...');
    try {
      const invoice = await stripe.invoices.retrieveUpcoming({
        customer: customerId,
      });
      console.log('✓ retrieveUpcoming worked!');
      console.log('  Total: $' + invoice.total / 100);
    } catch (e) {
      console.log('✗ retrieveUpcoming failed:', e.message);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testUpcomingInvoice();
