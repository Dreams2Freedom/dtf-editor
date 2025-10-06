#!/usr/bin/env node

/**
 * Test the admin users API endpoint directly
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAdminUsersQuery() {
  try {
    console.log('🔍 Testing admin users query...\n');

    // Test the exact query from the API
    const query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(0, 9); // First 10 users

    const { data: users, error, count } = await query;

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log(`✅ Query returned ${users.length} users`);
    console.log(`✅ Total count: ${count}\n`);

    console.log('📋 Users returned by API query:');
    console.log('----------------------------------------');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(
        `   Status: ${user.is_active !== false ? 'active' : 'suspended'}`
      );
      console.log(`   Plan: ${user.subscription_plan || 'free'}`);
      console.log(`   Credits: ${user.credits_remaining || 0}`);
      console.log('');
    });

    // Check for any filters that might be applied
    console.log('\n🔍 Checking for potential filter issues:');
    console.log('----------------------------------------');

    // Check is_active field
    const { data: activeCheck } = await supabase
      .from('profiles')
      .select('email, is_active');

    console.log('is_active values:');
    activeCheck.forEach(user => {
      console.log(
        `${user.email}: ${user.is_active === null ? 'NULL' : user.is_active}`
      );
    });

    // Check for full_name field
    const { data: nameCheck } = await supabase
      .from('profiles')
      .select('email, full_name, first_name, last_name');

    console.log('\nName fields:');
    nameCheck.forEach(user => {
      console.log(`${user.email}:`);
      console.log(`  full_name: ${user.full_name || 'NULL'}`);
      console.log(`  first_name: ${user.first_name || 'NULL'}`);
      console.log(`  last_name: ${user.last_name || 'NULL'}`);
    });
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testAdminUsersQuery();
