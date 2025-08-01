const stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

async function checkRecentPayments() {
  try {
    // List recent payment intents
    const paymentIntents = await stripeClient.paymentIntents.list({
      limit: 5,
      expand: ['data.latest_charge']
    });

    console.log(`Found ${paymentIntents.data.length} recent payment intents:\n`);
    
    paymentIntents.data.forEach((pi, index) => {
      console.log(`Payment Intent ${index + 1}:`);
      console.log('ID:', pi.id);
      console.log('Amount:', pi.amount / 100);
      console.log('Status:', pi.status);
      console.log('Metadata:', pi.metadata);
      console.log('Customer:', pi.customer);
      console.log('Created:', new Date(pi.created * 1000).toLocaleString());
      console.log('---\n');
    });

    // Also check recent checkout sessions
    const sessions = await stripeClient.checkout.sessions.list({
      limit: 5
    });

    console.log(`\nFound ${sessions.data.length} recent checkout sessions:\n`);
    
    sessions.data.forEach((session, index) => {
      console.log(`Checkout Session ${index + 1}:`);
      console.log('ID:', session.id);
      console.log('Amount:', session.amount_total / 100);
      console.log('Status:', session.status);
      console.log('Payment Status:', session.payment_status);
      console.log('Mode:', session.mode);
      console.log('Metadata:', session.metadata);
      console.log('Customer:', session.customer);
      console.log('---\n');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkRecentPayments();