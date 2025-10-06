#!/usr/bin/env node

/**
 * Script to test credit reset functionality
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    '❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testResetForUser(userId) {
  console.log(`\n🔄 Testing credit reset for user: ${userId}\n`);

  // Get user's current state
  const { data: profileBefore, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.log('❌ Error getting profile:', profileError.message);
    return;
  }

  console.log('📊 Before reset:');
  console.log(`   Credits: ${profileBefore.credits_remaining}`);
  console.log(`   Last reset: ${profileBefore.last_credit_reset || 'Never'}`);
  console.log(
    `   Subscription: ${profileBefore.subscription_status || 'free'}`
  );

  // Force reset by setting last_credit_reset to old date
  if (
    profileBefore.subscription_status === 'free' ||
    !profileBefore.subscription_status
  ) {
    console.log('\n🔧 Setting last reset to 31 days ago to trigger reset...');

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        last_credit_reset: new Date(
          Date.now() - 31 * 24 * 60 * 60 * 1000
        ).toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.log('❌ Error updating last reset:', updateError.message);
      return;
    }
  }

  // Call reset function
  console.log('\n🚀 Calling reset_monthly_credits function...');
  const { data: resetResult, error: resetError } = await supabase.rpc(
    'reset_monthly_credits',
    { p_user_id: userId }
  );

  if (resetError) {
    console.log('❌ Error calling reset function:', resetError.message);
    return;
  }

  if (resetResult && resetResult.length > 0) {
    console.log('\n✅ Reset successful!');
    console.log(`   Credits added: ${resetResult[0].credits_added}`);
    console.log(`   New balance: ${resetResult[0].new_balance}`);
  } else {
    console.log('\n⚠️  No reset performed (user may not be eligible)');
  }

  // Get updated profile
  const { data: profileAfter } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileAfter) {
    console.log('\n📊 After reset:');
    console.log(`   Credits: ${profileAfter.credits_remaining}`);
    console.log(`   Last reset: ${profileAfter.last_credit_reset}`);
  }

  // Check transaction log
  console.log('\n📝 Recent credit transactions:');
  const { data: transactions } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(3);

  if (transactions && transactions.length > 0) {
    transactions.forEach(t => {
      console.log(
        `   ${new Date(t.created_at).toLocaleString()}: ${t.type} - ${t.amount} credits`
      );
      console.log(`   ${t.description || 'No description'}`);
    });
  }
}

async function testResetAllEligibleUsers() {
  console.log('\n🔄 Testing reset for all eligible free users...\n');

  // Call reset function without specific user
  const { data: resetResults, error: resetError } = await supabase.rpc(
    'reset_monthly_credits'
  );

  if (resetError) {
    console.log('❌ Error calling reset function:', resetError.message);
    return;
  }

  if (resetResults && resetResults.length > 0) {
    console.log(`✅ Reset ${resetResults.length} users:`);
    resetResults.forEach(r => {
      console.log(
        `   User ${r.user_id.substring(0, 8)}...: +${r.credits_added} credits (new balance: ${r.new_balance})`
      );
    });
  } else {
    console.log('⚠️  No users were eligible for reset');
  }
}

async function main() {
  console.log('🚀 Credit Reset Test\n');

  const args = process.argv.slice(2);

  if (args.length > 0 && args[0] === '--all') {
    await testResetAllEligibleUsers();
  } else if (args.length > 0) {
    // Test specific user
    await testResetForUser(args[0]);
  } else {
    // Get a test user
    const { data: users } = await supabase
      .from('profiles')
      .select('id, email')
      .limit(1);

    if (users && users.length > 0) {
      console.log(`📧 Testing with user: ${users[0].email}`);
      await testResetForUser(users[0].id);
    } else {
      console.log('❌ No users found in database');
    }

    console.log('\n💡 Usage:');
    console.log(
      '   node test-credit-reset.js [user-id]     # Test specific user'
    );
    console.log(
      '   node test-credit-reset.js --all         # Test all eligible users'
    );
  }
}

main().catch(console.error);
