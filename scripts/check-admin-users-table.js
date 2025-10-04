require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('=== Checking admin_users table ===\n');

  const { data, error } = await supabase
    .from('admin_users')
    .select('*');

  if (error) {
    console.error('❌ Error querying admin_users table:', error.message);
    console.log('\nThe admin_users table does not exist!');
    console.log('Migration 20250103_create_admin_roles_system.sql has NOT been applied.\n');
  } else {
    console.log('✅ admin_users table exists!');
    console.log('Records:', data?.length || 0);

    if (data && data.length > 0) {
      console.log('\nAdmin users:');
      data.forEach((admin, i) => {
        console.log(`\n${i + 1}. User ID: ${admin.user_id}`);
        console.log(`   Role: ${admin.role}`);
        console.log(`   Active: ${admin.is_active}`);
        console.log(`   Permissions:`, admin.permissions);
      });
    } else {
      console.log('\n⚠️  Table exists but has no records!');
      console.log('You need to insert an admin user.');
    }
  }

  console.log('\n=== Checking for the logged-in user ===');
  console.log('Email: shannonherod@gmail.com');
  console.log('User ID: fcc1b251-6307-457c-ac1e-064aa43b2449');

  // Check if this user exists in auth.users
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

  if (!usersError && users) {
    const currentUser = users.find(u => u.email === 'shannonherod@gmail.com');
    if (currentUser) {
      console.log('\n✅ User exists in auth.users');
      console.log('   ID:', currentUser.id);
      console.log('   Email:', currentUser.email);
    } else {
      console.log('\n❌ User shannonherod@gmail.com NOT found in auth.users');
    }

    // Also check for shannon@s2transfers.com
    const superAdmin = users.find(u => u.email === 'shannon@s2transfers.com');
    if (superAdmin) {
      console.log('\n✅ Super admin email shannon@s2transfers.com exists');
      console.log('   ID:', superAdmin.id);
    } else {
      console.log('\n⚠️  Super admin email shannon@s2transfers.com NOT found in auth.users');
    }
  }
})();
