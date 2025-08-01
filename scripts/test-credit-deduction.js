#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCreditDeduction() {
  console.log('Testing credit deduction system...\n');

  // Test if functions exist
  try {
    // Test use_credits_with_expiration
    const { data: deductData, error: deductError } = await supabase.rpc('use_credits_with_expiration', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_credits_to_use: 1,
      p_operation: 'test'
    });

    if (deductError?.message?.includes('does not exist')) {
      console.log('❌ use_credits_with_expiration function NOT FOUND');
      console.log('\n⚠️  You need to run the SQL script first!');
      console.log('   1. Go to your Supabase dashboard');
      console.log('   2. Navigate to SQL Editor');
      console.log('   3. Run the script from: scripts/create-credit-functions.sql');
      console.log('   4. Then try processing images again\n');
      return;
    }

    console.log('✅ use_credits_with_expiration function exists');

    // Test add_credit_transaction
    const { error: txnError } = await supabase.rpc('add_credit_transaction', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_amount: 1,
      p_type: 'refund',
      p_description: 'Test refund',
      p_metadata: {}
    });

    if (txnError?.message?.includes('does not exist')) {
      console.log('❌ add_credit_transaction function NOT FOUND');
    } else {
      console.log('✅ add_credit_transaction function exists');
    }

  } catch (err) {
    console.error('Error testing functions:', err.message);
  }

  // Check if credit_transactions table exists
  const { data: tables, error: tableError } = await supabase
    .from('credit_transactions')
    .select('id')
    .limit(1);

  if (tableError?.message?.includes('does not exist')) {
    console.log('❌ credit_transactions table NOT FOUND');
  } else {
    console.log('✅ credit_transactions table exists');
  }

  console.log('\nCredit deduction system test complete.');
}

testCreditDeduction();