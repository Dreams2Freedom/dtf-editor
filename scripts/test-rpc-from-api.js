const fetch = require('node-fetch');

async function testRPCFromAPI() {
  try {
    console.log('Testing if add_user_credits works from the API context...\n');
    
    // Test calling the webhook endpoint directly with a test payload
    const testPayload = {
      id: 'evt_test',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test',
          amount: 799,
          status: 'succeeded',
          metadata: {
            userId: 'f689bb22-89dd-4c3c-a941-d77feb84428d',
            credits: '10',
            userEmail: 'snsmarketing@gmail.com'
          }
        }
      }
    };

    // Create Stripe signature
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const payloadString = JSON.stringify(testPayload);
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: payloadString,
      secret: process.env.STRIPE_WEBHOOK_SECRET
    });

    const response = await fetch('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature
      },
      body: payloadString
    });

    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response:', data);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Load env vars
require('dotenv').config({ path: '.env.local' });
testRPCFromAPI();