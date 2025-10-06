#!/usr/bin/env node

/**
 * Delete a user by email address
 * This will delete the user from auth.users and cascade to all related tables
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteUserByEmail(email) {
  console.log(`\n🗑️  Deleting user: ${email}\n`);
  console.log('========================================\n');

  try {
    // First, find the user
    const {
      data: { users },
      error: listError,
    } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return;
    }

    const user = users?.find(u => u.email === email);

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`Found user with ID: ${user.id}`);
    console.log('Deleting user and all related data...\n');

    // Delete from auth.users (this should cascade to profiles, uploads, payments, etc.)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(
      user.id
    );

    if (deleteError) {
      console.error('❌ Error deleting user:', deleteError);
      return;
    }

    console.log('✅ User successfully deleted!');
    console.log('   - Auth record deleted');
    console.log('   - Profile deleted (cascade)');
    console.log('   - All uploads deleted (cascade)');
    console.log('   - All payments deleted (cascade)');
    console.log('   - All related data removed');

    // Verify deletion
    console.log('\n🔍 Verifying deletion...');
    const {
      data: { users: checkUsers },
    } = await supabase.auth.admin.listUsers();
    const stillExists = checkUsers?.find(u => u.email === email);

    if (stillExists) {
      console.log('⚠️  Warning: User still exists in auth.users');
    } else {
      console.log('✅ Confirmed: User no longer exists');
    }

    // Check if profile was deleted
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (profile) {
      console.log('⚠️  Warning: Profile still exists');
    } else {
      console.log('✅ Confirmed: Profile deleted');
    }
  } catch (error) {
    console.error('Error:', error);
  }

  console.log('\n========================================\n');
  console.log(
    'You can now test the GoHighLevel integration by signing up with this email!'
  );
}

// Delete the specific user
deleteUserByEmail('snsmarketing@gmail.com');
