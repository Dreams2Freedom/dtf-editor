#!/usr/bin/env node

/**
 * Clean up test users from database
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function cleanup() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('Cleaning up test users...\n');

  // Get all test users
  const { data: authUsers } = await supabase.auth.admin.listUsers();

  const testEmails = [
    'test-renewal@example.com',
    'test-renewal-simple@example.com',
  ];

  for (const email of testEmails) {
    const user = authUsers?.users?.find(u => u.email === email);

    if (user) {
      console.log(`Found test user: ${email}`);

      // Delete transactions
      await supabase
        .from('credit_transactions')
        .delete()
        .eq('user_id', user.id);

      // Delete profile
      await supabase.from('profiles').delete().eq('id', user.id);

      // Delete auth user
      await supabase.auth.admin.deleteUser(user.id);

      console.log(`  ✅ Deleted ${email}\n`);
    }
  }

  console.log('Cleanup complete!');
}

cleanup().catch(console.error);
