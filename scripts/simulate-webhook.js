// This simulates what the webhook handler should do
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Test 1: Direct RPC call from Node.js
async function testDirectRPC() {
  console.log('\n1️⃣ Testing direct RPC call from Node.js...');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error } = await supabase.rpc('add_user_credits', {
    p_user_id: 'f689bb22-89dd-4c3c-a941-d77feb84428d',
    p_amount: 5,
    p_transaction_type: 'test',
    p_description: 'Testing from Node.js',
  });

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Success! Credits should increase by 5');
  }
}

// Test 2: Check if service role key is working
async function testServiceRole() {
  console.log('\n2️⃣ Testing service role access...');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Try to read from a table that requires auth
  const { data, error } = await supabase
    .from('profiles')
    .select('id, credits_remaining')
    .limit(1);

  if (error) {
    console.error('❌ Service role error:', error);
  } else {
    console.log('✅ Service role working, found profile:', data);
  }
}

// Test 3: Check latest payment intent from your purchase
async function checkLatestPayment() {
  console.log('\n3️⃣ Checking latest payment that should have added credits...');

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const paymentIntents = await stripe.paymentIntents.list({
    limit: 1,
    customer: 'cus_SljqE25ffokLaJ',
  });

  const latest = paymentIntents.data[0];
  console.log('Latest payment:', {
    id: latest.id,
    amount: latest.amount / 100,
    metadata: latest.metadata,
  });

  // Now add these credits
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error } = await supabase.rpc('add_user_credits', {
    p_user_id: latest.metadata.userId,
    p_amount: parseInt(latest.metadata.credits),
    p_transaction_type: 'purchase',
    p_description: `${latest.metadata.credits} credits purchase (webhook fix)`,
    p_metadata: {
      stripe_payment_intent_id: latest.id,
      price_paid: latest.amount,
    },
  });

  if (error) {
    console.error('❌ Failed to add credits:', error);
  } else {
    console.log('✅ Credits added for latest payment!');
  }
}

// Run all tests
async function runTests() {
  await testDirectRPC();
  await testServiceRole();
  await checkLatestPayment();

  // Check final balance
  console.log('\n📊 Checking final balance...');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data } = await supabase
    .from('profiles')
    .select('credits_remaining')
    .eq('id', 'f689bb22-89dd-4c3c-a941-d77feb84428d')
    .single();

  console.log('Current credits:', data?.credits_remaining);
}

runTests();
