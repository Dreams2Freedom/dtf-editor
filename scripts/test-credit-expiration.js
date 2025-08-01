#!/usr/bin/env node

/**
 * Script to test credit expiration functionality
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAddCreditPurchase(userId, purchaseType = 'one_time') {
  console.log(`\n💳 Testing credit purchase (${purchaseType})...\n`);

  const amounts = {
    one_time: { credits: 10, price: 799 }, // $7.99
    subscription: { credits: 20, price: 999 }, // $9.99
  };

  const purchase = amounts[purchaseType];

  const { data, error } = await supabase.rpc('add_credit_purchase', {
    p_user_id: userId,
    p_credits_amount: purchase.credits,
    p_price_paid: purchase.price,
    p_purchase_type: purchaseType,
    p_payment_method: 'test',
    p_stripe_payment_intent_id: `pi_test_${Date.now()}`
  });

  if (error) {
    console.log('❌ Error adding purchase:', error.message);
    return null;
  }

  console.log('✅ Purchase added successfully!');
  console.log(`   Purchase ID: ${data.id}`);
  console.log(`   Credits: ${data.credits_amount}`);
  console.log(`   Expires: ${new Date(data.expires_at).toLocaleDateString()}`);
  if (data.rollover_expires_at) {
    console.log(`   Rollover expires: ${new Date(data.rollover_expires_at).toLocaleDateString()}`);
  }

  return data.id;
}

async function testUseCreditsFIFO(userId, creditsToUse) {
  console.log(`\n🎯 Testing FIFO credit usage (${creditsToUse} credits)...\n`);

  const { data, error } = await supabase.rpc('use_credits_with_expiration', {
    p_user_id: userId,
    p_credits_to_use: creditsToUse,
    p_operation: 'Test operation - FIFO usage'
  });

  if (error) {
    console.log('❌ Error using credits:', error.message);
    return;
  }

  if (data && data.length > 0) {
    const result = data[0];
    if (result.success) {
      console.log('✅ Credits used successfully!');
      console.log(`   Credits used: ${result.credits_used}`);
      console.log(`   Remaining balance: ${result.remaining_balance}`);
    } else {
      console.log('❌ Insufficient credits');
    }
  }
}

async function showCreditSummary(userId) {
  console.log('\n📊 Credit Summary:\n');

  // Get user credit summary
  const { data: summary, error: summaryError } = await supabase
    .from('user_credit_summary')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (summary) {
    console.log(`   Total credits: ${summary.total_credits}`);
    console.log(`   Active credits: ${summary.active_credits}`);
    console.log(`   Rollover credits: ${summary.rollover_credits}`);
    if (summary.next_expiration_date) {
      console.log(`   Next expiration: ${new Date(summary.next_expiration_date).toLocaleDateString()}`);
    }
    console.log(`   Active purchases: ${summary.active_purchases}`);
  }

  // Show detailed purchases
  console.log('\n📦 Active Purchases:');
  const { data: purchases } = await supabase
    .from('credit_purchases')
    .select('*')
    .eq('user_id', userId)
    .gt('credits_remaining', 0)
    .order('created_at', { ascending: true });

  if (purchases && purchases.length > 0) {
    purchases.forEach(p => {
      console.log(`\n   Purchase: ${p.purchase_type}`);
      console.log(`   Credits: ${p.credits_remaining}/${p.credits_amount}`);
      console.log(`   Expires: ${new Date(p.expires_at).toLocaleDateString()}`);
      if (p.rollover_expires_at) {
        console.log(`   Rollover until: ${new Date(p.rollover_expires_at).toLocaleDateString()}`);
      }
    });
  } else {
    console.log('   No active purchases');
  }
}

async function testExpiredCreditsCleanup() {
  console.log('\n🧹 Testing expired credits cleanup...\n');

  const { data, error } = await supabase.rpc('cleanup_expired_credits');

  if (error) {
    console.log('❌ Error cleaning up credits:', error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log(`✅ Cleaned up expired credits for ${data.length} users:`);
    data.forEach(d => {
      console.log(`   User ${d.user_id.substring(0, 8)}...: ${d.credits_expired} credits expired`);
    });
  } else {
    console.log('⚠️  No expired credits to clean up');
  }
}

async function main() {
  console.log('🚀 Credit Expiration Test\n');

  const args = process.argv.slice(2);
  
  // Get a test user
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email')
    .limit(1);

  if (!users || users.length === 0) {
    console.log('❌ No users found in database');
    return;
  }

  const userId = args[0] || users[0].id;
  console.log(`📧 Testing with user: ${users[0].email}`);

  // Show initial state
  await showCreditSummary(userId);

  if (args[1] === 'purchase') {
    // Test adding purchases
    await testAddCreditPurchase(userId, 'one_time');
    await testAddCreditPurchase(userId, 'subscription');
    await showCreditSummary(userId);
  } else if (args[1] === 'use') {
    // Test using credits
    const creditsToUse = parseInt(args[2]) || 5;
    await testUseCreditsFIFO(userId, creditsToUse);
    await showCreditSummary(userId);
  } else if (args[1] === 'cleanup') {
    // Test cleanup
    await testExpiredCreditsCleanup();
  } else {
    console.log('\n💡 Usage:');
    console.log('   node test-credit-expiration.js [user-id] purchase     # Add test purchases');
    console.log('   node test-credit-expiration.js [user-id] use [amount] # Use credits (FIFO)');
    console.log('   node test-credit-expiration.js [user-id] cleanup      # Clean expired credits');
  }
}

main().catch(console.error);