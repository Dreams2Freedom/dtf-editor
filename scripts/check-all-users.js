#!/usr/bin/env node

/**
 * Check all users in the database
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

async function checkUsers() {
  try {
    console.log('🔍 Checking all users in the database...\n');

    // Get total count of users in auth.users
    const { data: authUsers, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) {
      console.log('⚠️  Could not access auth.users table (requires admin API)');
    } else {
      console.log(`✅ Total users in auth.users: ${authUsers.users.length}`);
    }

    // Get all profiles without pagination
    const {
      data: profiles,
      error: profileError,
      count,
    } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (profileError) {
      console.error('❌ Error fetching profiles:', profileError);
      return;
    }

    console.log(`✅ Total profiles in database: ${count || profiles.length}\n`);

    // Show first 10 users
    console.log('📋 User List (showing all):');
    console.log('----------------------------------------');

    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.email || 'No email'}`);
      console.log(`   ID: ${profile.id}`);
      console.log(
        `   Name: ${profile.first_name || ''} ${profile.last_name || ''} ${!profile.first_name && !profile.last_name ? '(No name set)' : ''}`
      );
      console.log(`   Plan: ${profile.subscription_plan || 'free'}`);
      console.log(`   Credits: ${profile.credits_remaining || 0}`);
      console.log(`   Admin: ${profile.is_admin ? '✓' : '✗'}`);
      console.log(
        `   Created: ${new Date(profile.created_at).toLocaleDateString()}`
      );
      console.log('');
    });

    // Check for pagination issues
    console.log('\n📊 Pagination Test:');
    console.log('----------------------------------------');

    // Test first page
    const { data: page1, count: count1 } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .range(0, 9);

    console.log(`Page 1 (limit 10): ${page1?.length} users`);

    // Test second page
    const { data: page2 } = await supabase
      .from('profiles')
      .select('*')
      .range(10, 19);

    console.log(`Page 2 (limit 10): ${page2?.length} users`);

    console.log(`\nTotal count from query: ${count1}`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUsers();
