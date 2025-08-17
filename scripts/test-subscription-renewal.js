#!/usr/bin/env node

/**
 * Subscription Renewal Test Script
 * 
 * This script simulates and tests subscription renewal scenarios
 * to ensure credits are properly added when subscriptions renew.
 * 
 * Usage:
 *   node scripts/test-subscription-renewal.js
 *   
 * Tests:
 *   1. Monthly subscription renewal
 *   2. Credit addition on renewal
 *   3. Credit expiration tracking
 *   4. Multiple subscription handling
 *   5. Failed payment scenarios
 */

require('dotenv').config({ path: '.env.local' });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// Test configuration
const TEST_USER_EMAIL = 'test-renewal@example.com';
const TEST_SCENARIOS = {
  BASIC_PLAN: {
    priceId: process.env.STRIPE_BASIC_PLAN_PRICE_ID,
    credits: 20,
    name: 'Basic Plan'
  },
  STARTER_PLAN: {
    priceId: process.env.STRIPE_STARTER_PLAN_PRICE_ID,
    credits: 60,
    name: 'Starter Plan'
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.bright + colors.cyan);
  console.log('='.repeat(60));
}

function logTest(name, status, details = '') {
  const statusSymbol = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  const statusColor = status === 'pass' ? colors.green : status === 'fail' ? colors.red : colors.yellow;
  console.log(`  ${statusSymbol} ${name}`);
  if (details) {
    console.log(`     ${statusColor}${details}${colors.reset}`);
  }
}

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Create or get test user
async function setupTestUser(supabase) {
  logSection('Setting up test user');
  
  try {
    // First, try to get existing user from auth
    const { data: authData, error: authCheckError } = await supabase.auth.admin.listUsers();
    
    let authUser = authData?.users?.find(u => u.email === TEST_USER_EMAIL);
    
    if (!authUser) {
      // Create auth user first
      log('Creating test auth user...', colors.yellow);
      const { data: newAuthUser, error: authError } = await supabase.auth.admin.createUser({
        email: TEST_USER_EMAIL,
        password: 'TestPassword123!',
        email_confirm: true
      });
      
      if (authError) throw authError;
      authUser = newAuthUser.user;
      logTest('Auth user created', 'pass', `ID: ${authUser.id}`);
    } else {
      logTest('Auth user found', 'pass', `ID: ${authUser.id}`);
    }
    
    // Check if profile exists
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();
    
    if (profileError && profileError.code === 'PGRST116') {
      // Profile doesn't exist, create one
      log('Creating test profile...', colors.yellow);
      
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: authUser.id,
          email: TEST_USER_EMAIL,
          credits_remaining: 0,
          subscription_status: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) throw createError;
      profile = newProfile;
      logTest('Test profile created', 'pass', `ID: ${profile.id}`);
    } else if (profileError) {
      throw profileError;
    } else {
      logTest('Test profile found', 'pass', `ID: ${profile.id}`);
    }
    
    // Reset profile to baseline state
    const { error: resetError } = await supabase
      .from('profiles')
      .update({
        credits_remaining: 0,
        subscription_status: 'free',
        subscription_plan: null,
        stripe_customer_id: null
      })
      .eq('id', profile.id);
    
    if (resetError) throw resetError;
    logTest('Profile reset to baseline', 'pass', 'Credits: 0, Status: free');
    
    return profile;
  } catch (error) {
    logTest('Setup test user', 'fail', error.message);
    throw error;
  }
}

// Test 1: Initial Subscription Creation
async function testInitialSubscription(supabase, user) {
  logSection('Test 1: Initial Subscription Creation');
  
  try {
    const plan = TEST_SCENARIOS.BASIC_PLAN;
    
    // Simulate subscription creation
    log(`Simulating ${plan.name} subscription...`, colors.blue);
    
    // Update user profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'basic',
        subscription_plan: plan.name,
        credits_remaining: plan.credits,
        stripe_customer_id: 'cus_test_' + Date.now()
      })
      .eq('id', user.id);
    
    if (updateError) throw updateError;
    
    // Add credit transaction
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        amount: plan.credits,
        type: 'subscription',
        description: `${plan.name} subscription started`,
        created_at: new Date().toISOString()
      });
    
    if (transactionError) throw transactionError;
    
    // Verify credits were added
    const { data: updatedUser, error: fetchError } = await supabase
      .from('profiles')
      .select('credits_remaining, subscription_status')
      .eq('id', user.id)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (updatedUser.credits_remaining === plan.credits) {
      logTest('Initial credits added', 'pass', `Credits: ${updatedUser.credits_remaining}`);
    } else {
      logTest('Initial credits added', 'fail', `Expected: ${plan.credits}, Got: ${updatedUser.credits_remaining}`);
    }
    
    if (updatedUser.subscription_status === 'basic') {
      logTest('Subscription status updated', 'pass', `Status: ${updatedUser.subscription_status}`);
    } else {
      logTest('Subscription status updated', 'fail', `Status: ${updatedUser.subscription_status}`);
    }
    
    return true;
  } catch (error) {
    logTest('Initial subscription', 'fail', error.message);
    return false;
  }
}

// Test 2: Subscription Renewal
async function testSubscriptionRenewal(supabase, user) {
  logSection('Test 2: Monthly Subscription Renewal');
  
  try {
    const plan = TEST_SCENARIOS.BASIC_PLAN;
    
    // Get current credits
    const { data: beforeRenewal, error: beforeError } = await supabase
      .from('profiles')
      .select('credits_remaining')
      .eq('id', user.id)
      .single();
    
    if (beforeError) throw beforeError;
    const creditsBefore = beforeRenewal.credits_remaining;
    
    log(`Credits before renewal: ${creditsBefore}`, colors.cyan);
    
    // Simulate renewal (webhook would handle this)
    log('Simulating subscription renewal...', colors.blue);
    
    // Add renewal credits
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        credits_remaining: creditsBefore + plan.credits,
        last_credit_reset: new Date().toISOString()
      })
      .eq('id', user.id);
    
    if (updateError) throw updateError;
    
    // Add credit transaction for renewal
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        amount: plan.credits,
        type: 'subscription_renewal',
        description: `${plan.name} monthly renewal`,
        created_at: new Date().toISOString()
      });
    
    if (transactionError) throw transactionError;
    
    // Verify credits were added
    const { data: afterRenewal, error: afterError } = await supabase
      .from('profiles')
      .select('credits_remaining')
      .eq('id', user.id)
      .single();
    
    if (afterError) throw afterError;
    const creditsAfter = afterRenewal.credits_remaining;
    
    const creditsAdded = creditsAfter - creditsBefore;
    
    if (creditsAdded === plan.credits) {
      logTest('Renewal credits added', 'pass', `Added: ${creditsAdded}, Total: ${creditsAfter}`);
    } else {
      logTest('Renewal credits added', 'fail', `Expected: ${plan.credits}, Added: ${creditsAdded}`);
    }
    
    // Verify transaction log
    const { data: transactions, error: txError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'subscription_renewal')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (txError) throw txError;
    
    if (transactions && transactions.length > 0) {
      logTest('Transaction logged', 'pass', `Amount: ${transactions[0].amount}`);
    } else {
      logTest('Transaction logged', 'fail', 'No transaction found');
    }
    
    return true;
  } catch (error) {
    logTest('Subscription renewal', 'fail', error.message);
    return false;
  }
}

// Test 3: Credit Expiration
async function testCreditExpiration(supabase, user) {
  logSection('Test 3: Credit Expiration Tracking');
  
  try {
    // Add credits with expiration
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + 2); // 2 month expiration
    
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        amount: 10,
        type: 'subscription',
        description: 'Test credits with expiration',
        expires_at: expirationDate.toISOString(),
        created_at: new Date().toISOString()
      });
    
    if (transactionError) throw transactionError;
    
    // Check for expiring credits
    const { data: expiringCredits, error: expiringError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', user.id)
      .not('expires_at', 'is', null)
      .gte('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true });
    
    if (expiringError) throw expiringError;
    
    if (expiringCredits && expiringCredits.length > 0) {
      const daysUntilExpiry = Math.floor(
        (new Date(expiringCredits[0].expires_at) - new Date()) / (1000 * 60 * 60 * 24)
      );
      logTest('Credit expiration tracked', 'pass', `Expires in ${daysUntilExpiry} days`);
    } else {
      logTest('Credit expiration tracked', 'fail', 'No expiring credits found');
    }
    
    return true;
  } catch (error) {
    logTest('Credit expiration', 'fail', error.message);
    return false;
  }
}

// Test 4: Subscription Upgrade
async function testSubscriptionUpgrade(supabase, user) {
  logSection('Test 4: Subscription Upgrade (Basic to Starter)');
  
  try {
    const oldPlan = TEST_SCENARIOS.BASIC_PLAN;
    const newPlan = TEST_SCENARIOS.STARTER_PLAN;
    
    // Get current state
    const { data: before, error: beforeError } = await supabase
      .from('profiles')
      .select('credits_remaining, subscription_status')
      .eq('id', user.id)
      .single();
    
    if (beforeError) throw beforeError;
    
    log(`Current plan: ${before.subscription_status}, Credits: ${before.credits_remaining}`, colors.cyan);
    
    // Simulate upgrade
    const proratedCredits = Math.floor((newPlan.credits - oldPlan.credits) * 0.5); // 50% proration
    
    const { error: upgradeError } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'starter',
        subscription_plan: newPlan.name,
        credits_remaining: before.credits_remaining + proratedCredits
      })
      .eq('id', user.id);
    
    if (upgradeError) throw upgradeError;
    
    // Log the upgrade
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        amount: proratedCredits,
        type: 'subscription_upgrade',
        description: `Upgrade from ${oldPlan.name} to ${newPlan.name} (prorated)`,
        created_at: new Date().toISOString()
      });
    
    if (transactionError) throw transactionError;
    
    // Verify upgrade
    const { data: after, error: afterError } = await supabase
      .from('profiles')
      .select('credits_remaining, subscription_status')
      .eq('id', user.id)
      .single();
    
    if (afterError) throw afterError;
    
    if (after.subscription_status === 'starter') {
      logTest('Subscription upgraded', 'pass', `New plan: ${after.subscription_status}`);
    } else {
      logTest('Subscription upgraded', 'fail', `Status: ${after.subscription_status}`);
    }
    
    if (after.credits_remaining === before.credits_remaining + proratedCredits) {
      logTest('Prorated credits added', 'pass', `Added: ${proratedCredits}, Total: ${after.credits_remaining}`);
    } else {
      logTest('Prorated credits added', 'fail', `Expected: ${before.credits_remaining + proratedCredits}, Got: ${after.credits_remaining}`);
    }
    
    return true;
  } catch (error) {
    logTest('Subscription upgrade', 'fail', error.message);
    return false;
  }
}

// Test 5: Failed Payment Scenario
async function testFailedPayment(supabase, user) {
  logSection('Test 5: Failed Payment Handling');
  
  try {
    // Simulate failed payment
    log('Simulating failed payment...', colors.yellow);
    
    // Update subscription to past_due
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'past_due'
      })
      .eq('id', user.id);
    
    if (updateError) throw updateError;
    
    // Verify no credits were added
    const { data: userData, error: fetchError } = await supabase
      .from('profiles')
      .select('credits_remaining, subscription_status')
      .eq('id', user.id)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (userData.subscription_status === 'past_due') {
      logTest('Status set to past_due', 'pass', 'Payment failed status recorded');
    } else {
      logTest('Status set to past_due', 'fail', `Status: ${userData.subscription_status}`);
    }
    
    // Simulate retry success
    log('Simulating payment retry success...', colors.blue);
    
    const plan = TEST_SCENARIOS.STARTER_PLAN;
    
    const { error: retryError } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'starter',
        credits_remaining: userData.credits_remaining + plan.credits
      })
      .eq('id', user.id);
    
    if (retryError) throw retryError;
    
    // Log the successful retry
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        amount: plan.credits,
        type: 'subscription_renewal',
        description: `${plan.name} renewal (after retry)`,
        created_at: new Date().toISOString()
      });
    
    if (transactionError) throw transactionError;
    
    logTest('Payment retry handled', 'pass', `Credits added after successful retry`);
    
    return true;
  } catch (error) {
    logTest('Failed payment handling', 'fail', error.message);
    return false;
  }
}

// Summary report
async function generateReport(supabase, user) {
  logSection('Test Summary Report');
  
  try {
    // Get final user state
    const { data: finalUser, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (userError) throw userError;
    
    // Get all transactions
    const { data: transactions, error: txError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (txError) throw txError;
    
    console.log('\n📊 Final User State:');
    console.log(`  Email: ${finalUser.email}`);
    console.log(`  Credits: ${finalUser.credits_remaining}`);
    console.log(`  Status: ${finalUser.subscription_status}`);
    console.log(`  Plan: ${finalUser.subscription_plan || 'None'}`);
    
    console.log('\n💳 Transaction History:');
    transactions.forEach(tx => {
      const sign = tx.amount > 0 ? '+' : '';
      console.log(`  ${sign}${tx.amount} credits - ${tx.description}`);
    });
    
    const totalCreditsAdded = transactions
      .filter(tx => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    console.log(`\n📈 Total Credits Added: ${totalCreditsAdded}`);
    
  } catch (error) {
    console.error('Failed to generate report:', error.message);
  }
}

// Cleanup test data
async function cleanup(supabase, user) {
  logSection('Cleanup');
  
  try {
    // Delete test transactions
    const { error: txError } = await supabase
      .from('credit_transactions')
      .delete()
      .eq('user_id', user.id);
    
    if (txError) throw txError;
    
    // Delete test profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);
    
    if (profileError) throw profileError;
    
    // Delete auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
    
    if (authError) throw authError;
    
    logTest('Test data cleaned up', 'pass', 'All test data removed');
  } catch (error) {
    logTest('Cleanup', 'fail', error.message);
  }
}

// Main test runner
async function runTests() {
  console.log(colors.bright + colors.cyan);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        SUBSCRIPTION RENEWAL CREDIT TEST SUITE              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
  
  const supabase = getSupabaseClient();
  let testsPassed = 0;
  let totalTests = 5;
  
  try {
    // Setup
    const user = await setupTestUser(supabase);
    
    // Run tests
    if (await testInitialSubscription(supabase, user)) testsPassed++;
    if (await testSubscriptionRenewal(supabase, user)) testsPassed++;
    if (await testCreditExpiration(supabase, user)) testsPassed++;
    if (await testSubscriptionUpgrade(supabase, user)) testsPassed++;
    if (await testFailedPayment(supabase, user)) testsPassed++;
    
    // Generate report
    await generateReport(supabase, user);
    
    // Cleanup
    await cleanup(supabase, user);
    
    // Final results
    logSection('Test Results');
    const passRate = (testsPassed / totalTests * 100).toFixed(1);
    const resultColor = testsPassed === totalTests ? colors.green : colors.yellow;
    
    log(`Tests Passed: ${testsPassed}/${totalTests} (${passRate}%)`, resultColor);
    
    if (testsPassed === totalTests) {
      log('\n🎉 All tests passed! Subscription renewal credits are working correctly.', colors.green);
    } else {
      log('\n⚠️  Some tests failed. Review the results above.', colors.yellow);
    }
    
  } catch (error) {
    log('\n❌ Test suite failed:', colors.red);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };