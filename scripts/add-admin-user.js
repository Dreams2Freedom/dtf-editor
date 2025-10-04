require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('=== Adding shannonherod@gmail.com to admin_users ===\n');

  const userId = 'fcc1b251-6307-457c-ac1e-064aa43b2449';
  const email = 'shannonherod@gmail.com';

  // Check if user already exists
  const { data: existingAdmin, error: checkError } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existingAdmin) {
    console.log('✅ User already exists in admin_users table');
    console.log('   Role:', existingAdmin.role);
    console.log('   Active:', existingAdmin.is_active);
    console.log('   Permissions:', existingAdmin.permissions);
    process.exit(0);
  }

  // Insert the admin user
  const { data, error } = await supabase
    .from('admin_users')
    .insert({
      user_id: userId,
      role: 'super_admin',
      permissions: {
        view_all_users: true,
        edit_users: true,
        view_financials: true,
        manage_affiliates: true,
        manage_support: true,
        manage_admins: true,
        system_settings: true
      },
      is_active: true,
      notes: 'Super Administrator - Added via script'
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error inserting admin user:', error.message);
    process.exit(1);
  }

  console.log('✅ Successfully added shannonherod@gmail.com to admin_users!');
  console.log('\nAdmin record:');
  console.log('   User ID:', data.user_id);
  console.log('   Role:', data.role);
  console.log('   Active:', data.is_active);
  console.log('   Permissions:', JSON.stringify(data.permissions, null, 2));

  console.log('\n✅ You can now access the admin panel at /admin/affiliates/applications');
})();
