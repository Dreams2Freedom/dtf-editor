/**
 * Check if admin_users table exists
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAdminTables() {
  console.log('🔍 Checking Admin System Tables...\n');

  try {
    // Check if admin_users table exists
    console.log('1. Checking admin_users table:');
    const { data: adminUsers, error: adminError } = await supabase
      .from('admin_users')
      .select('count');

    if (adminError) {
      if (adminError.message.includes('does not exist')) {
        console.log('   ❌ admin_users table does NOT exist');
        console.log('   ⚠️  You need to run the migration!\n');
      } else {
        console.log('   ❌ Error:', adminError.message);
      }
    } else {
      console.log('   ✅ admin_users table exists!');

      // Count admins
      const { count } = await supabase
        .from('admin_users')
        .select('*', { count: 'exact', head: true });

      console.log(`   Found ${count || 0} admin(s)\n`);
    }

    // Check if admin_role_presets table exists
    console.log('2. Checking admin_role_presets table:');
    const { data: presets, error: presetsError } = await supabase
      .from('admin_role_presets')
      .select('count');

    if (presetsError) {
      if (presetsError.message.includes('does not exist')) {
        console.log('   ❌ admin_role_presets table does NOT exist\n');
      } else {
        console.log('   ❌ Error:', presetsError.message);
      }
    } else {
      console.log('   ✅ admin_role_presets table exists!\n');
    }

    // Check if functions exist
    console.log('3. Checking admin functions:');

    // Try to call is_admin function
    try {
      const { data, error } = await supabase.rpc('is_admin', {
        user_id: '00000000-0000-0000-0000-000000000000',
      });

      if (error) {
        if (error.message.includes('does not exist')) {
          console.log('   ❌ is_admin() function does NOT exist');
        } else {
          console.log('   ✅ is_admin() function exists');
        }
      } else {
        console.log('   ✅ is_admin() function exists');
      }
    } catch (e) {
      console.log('   ❌ is_admin() function does NOT exist');
    }

    // Try to call get_admin_role function
    try {
      const { data, error } = await supabase.rpc('get_admin_role', {
        user_id: '00000000-0000-0000-0000-000000000000',
      });

      if (error) {
        if (error.message.includes('does not exist')) {
          console.log('   ❌ get_admin_role() function does NOT exist');
        } else {
          console.log('   ✅ get_admin_role() function exists');
        }
      } else {
        console.log('   ✅ get_admin_role() function exists');
      }
    } catch (e) {
      console.log('   ❌ get_admin_role() function does NOT exist');
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 NEXT STEPS:');
    console.log('='.repeat(60));
    console.log('\nIf any tables or functions are missing:\n');
    console.log('1. Go to: https://supabase.com/dashboard');
    console.log('2. Select your DTF Editor project');
    console.log('3. Navigate to: SQL Editor');
    console.log('4. Create a new query');
    console.log('5. Copy the entire file:');
    console.log(
      '   supabase/migrations/20250103_create_admin_roles_system.sql'
    );
    console.log('6. Paste and click "Run"\n');
    console.log('After running the migration:');
    console.log('  ✅ You will be set as super_admin');
    console.log('  ✅ /admin/users/admins will work');
    console.log('  ✅ /admin/affiliates will work');
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkAdminTables();
