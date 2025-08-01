#!/usr/bin/env node

/**
 * Script to add Stripe-related columns to profiles table
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

async function checkColumns() {
  console.log('🔍 Checking for Stripe columns in profiles table...\n');

  // Try to select the Stripe columns
  const { data, error } = await supabase
    .from('profiles')
    .select('stripe_customer_id, stripe_subscription_id, subscription_current_period_end, subscription_canceled_at')
    .limit(1);

  if (error) {
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.log('❌ Some Stripe columns are missing from profiles table');
      return false;
    } else {
      console.log('⚠️  Error checking columns:', error.message);
      return null;
    }
  }

  console.log('✅ All Stripe columns exist in profiles table');
  return true;
}

async function main() {
  console.log('🚀 Stripe Columns Check\n');

  const columnsExist = await checkColumns();

  if (columnsExist === false) {
    console.log('\n📝 To add the missing columns:\n');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the migration: supabase/migrations/010_add_stripe_columns.sql');
  } else if (columnsExist === true) {
    console.log('\n✨ Your profiles table is ready for Stripe integration!');
    
    // Show sample data
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, stripe_customer_id, stripe_subscription_id, subscription_status')
      .not('stripe_customer_id', 'is', null)
      .limit(5);

    if (profiles && profiles.length > 0) {
      console.log('\n📊 Sample Stripe customers:');
      profiles.forEach(p => {
        console.log(`   User ${p.id.substring(0, 8)}...`);
        console.log(`   Customer: ${p.stripe_customer_id || 'None'}`);
        console.log(`   Subscription: ${p.stripe_subscription_id || 'None'}`);
        console.log(`   Status: ${p.subscription_status || 'free'}\n`);
      });
    } else {
      console.log('\n   No Stripe customers found yet.');
    }
  }
}

main().catch(console.error);