#!/usr/bin/env node

/**
 * Script to check and apply credit system migrations
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
  console.log('🔍 Checking if credit tables exist...\n');

  // Check credit_transactions table
  const { data: creditTransactions, error: ctError } = await supabase
    .from('credit_transactions')
    .select('id')
    .limit(1);

  if (ctError && ctError.code === '42P01') {
    console.log('❌ credit_transactions table does not exist');
    return { creditTransactions: false, creditPurchases: false };
  } else if (ctError) {
    console.log('⚠️  Error checking credit_transactions:', ctError.message);
  } else {
    console.log('✅ credit_transactions table exists');
  }

  // Check credit_purchases table
  const { data: creditPurchases, error: cpError } = await supabase
    .from('credit_purchases')
    .select('id')
    .limit(1);

  if (cpError && cpError.code === '42P01') {
    console.log('❌ credit_purchases table does not exist');
    return { creditTransactions: !ctError, creditPurchases: false };
  } else if (cpError) {
    console.log('⚠️  Error checking credit_purchases:', cpError.message);
  } else {
    console.log('✅ credit_purchases table exists');
  }

  // Check profiles columns
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('last_credit_reset, credit_expires_at')
    .limit(1);

  if (!profileError) {
    console.log('✅ profiles table has credit tracking columns');
  } else {
    console.log('⚠️  profiles table may be missing credit columns:', profileError.message);
  }

  return {
    creditTransactions: !ctError,
    creditPurchases: !cpError,
    profileColumns: !profileError
  };
}

async function checkFunctions() {
  console.log('\n🔍 Checking if credit functions exist...\n');

  try {
    // Try to get function info (this might not work in all Supabase setups)
    const { data, error } = await supabase.rpc('add_credit_transaction', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_amount: 0,
      p_type: 'manual',
      p_description: 'Test'
    });

    // If we get a "user not found" error, the function exists
    if (error && error.message.includes('violates foreign key constraint')) {
      console.log('✅ add_credit_transaction function exists');
    } else if (error && error.code === '42883') {
      console.log('❌ add_credit_transaction function does not exist');
      return false;
    } else {
      console.log('✅ add_credit_transaction function exists');
    }
  } catch (e) {
    console.log('⚠️  Could not verify functions:', e.message);
  }

  return true;
}

async function main() {
  console.log('🚀 Credit System Migration Check\n');

  const tablesExist = await checkTables();
  const functionsExist = await checkFunctions();

  console.log('\n📋 Migration Status:\n');

  if (tablesExist.creditTransactions && tablesExist.creditPurchases && tablesExist.profileColumns) {
    console.log('✅ All credit system tables are properly set up!');
  } else {
    console.log('❌ Some credit system tables are missing.\n');
    console.log('📝 To apply the migrations:\n');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the following migrations in order:\n');
    
    if (!tablesExist.creditTransactions) {
      console.log('   - supabase/migrations/008_create_credit_transactions.sql');
    }
    if (!tablesExist.creditPurchases) {
      console.log('   - supabase/migrations/009_credit_expiration_tracking.sql');
    }
  }

  // Show sample data
  if (tablesExist.creditTransactions) {
    console.log('\n📊 Recent Credit Transactions:\n');
    const { data: transactions, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (transactions && transactions.length > 0) {
      transactions.forEach(t => {
        console.log(`   ${t.type}: ${t.amount} credits - ${t.description || 'No description'}`);
        console.log(`   User: ${t.user_id.substring(0, 8)}... | Balance After: ${t.balance_after}`);
        console.log(`   Created: ${new Date(t.created_at).toLocaleString()}\n`);
      });
    } else {
      console.log('   No transactions found yet.\n');
    }
  }

  console.log('\n✨ Done!');
}

main().catch(console.error);