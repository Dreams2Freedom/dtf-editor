#!/usr/bin/env node

// Test script to verify credit purchase flow
const https = require('https');

// Simulate a Stripe webhook event
const testWebhookPayload = {
  id: 'evt_test_' + Date.now(),
  object: 'event',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_' + Date.now(),
      object: 'checkout.session',
      amount_total: 799,
      currency: 'usd',
      customer: 'cus_test',
      metadata: {
        userId: 'f689bb22-89dd-4c3c-a941-d77feb84428d',
        credits: '10',
        userEmail: 'snsmarketing@gmail.com',
      },
      mode: 'payment',
      payment_status: 'paid',
      status: 'complete',
    },
  },
};

// Send test webhook to production endpoint
const options = {
  hostname: 'dtf-editor-anfzq15m1-s2-transfers.vercel.app',
  port: 443,
  path: '/api/webhooks/stripe',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'stripe-signature': 'test_signature', // This will fail validation but shows if endpoint is reachable
  },
};

const req = https.request(options, res => {
  console.log(`Status Code: ${res.statusCode}`);

  let data = '';
  res.on('data', chunk => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', error => {
  console.error('Error:', error);
});

req.write(JSON.stringify(testWebhookPayload));
req.end();

console.log('Test webhook sent to production endpoint');
console.log('Check your dashboard to see if credits were added');
