#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function check() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('Checking test profiles...\n');

  // Get all profiles with test emails
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, created_at')
    .like('email', '%test%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${profiles?.length || 0} test profiles:`);
  profiles?.forEach(p => {
    console.log(`  - ${p.email} (ID: ${p.id})`);
  });

  // Check orphaned profiles
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const authUserIds = authUsers?.users?.map(u => u.id) || [];

  const orphaned = profiles?.filter(p => !authUserIds.includes(p.id)) || [];

  if (orphaned.length > 0) {
    console.log(
      '\n⚠️  Found orphaned profiles (no auth user):',
      orphaned.length
    );

    for (const profile of orphaned) {
      console.log(`  Deleting orphaned profile: ${profile.email}`);

      // Delete transactions first
      await supabase
        .from('credit_transactions')
        .delete()
        .eq('user_id', profile.id);

      // Delete profile
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profile.id);

      if (deleteError) {
        console.error(`    Error deleting: ${deleteError.message}`);
      } else {
        console.log(`    ✅ Deleted`);
      }
    }
  }
}

check().catch(console.error);
