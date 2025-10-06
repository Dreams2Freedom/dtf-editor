require('dotenv').config({ path: '.env.production' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('Checking if admin functions exist in production...\n');

  const userId = '1596097b-8333-452a-a2bd-ea27340677ec'; // Shannon@S2Transfers.com

  // Test get_admin_role
  console.log('1. Testing get_admin_role function:');
  const { data: role, error: roleError } = await supabase.rpc(
    'get_admin_role',
    { user_id: userId }
  );

  if (roleError) {
    console.error('   ❌ Error:', roleError.message);
    console.log('   → Function does NOT exist in production');
  } else {
    console.log('   ✅ Function exists, result:', role);
  }

  // Test is_super_admin
  console.log('\n2. Testing is_super_admin function:');
  const { data: isSuperAdmin, error: superAdminError } = await supabase.rpc(
    'is_super_admin',
    { user_id: userId }
  );

  if (superAdminError) {
    console.error('   ❌ Error:', superAdminError.message);
    console.log('   → Function does NOT exist in production');
  } else {
    console.log('   ✅ Function exists, result:', isSuperAdmin);
  }

  // Test has_permission
  console.log('\n3. Testing has_permission function:');
  const { data: hasPermission, error: permError } = await supabase.rpc(
    'has_permission',
    { user_id: userId, permission_key: 'manage_affiliates' }
  );

  if (permError) {
    console.error('   ❌ Error:', permError.message);
    console.log('   → Function does NOT exist in production');
  } else {
    console.log('   ✅ Function exists, result:', hasPermission);
  }

  console.log('\n=== SUMMARY ===');
  if (roleError || superAdminError || permError) {
    console.log('❌ Missing functions need to be created in production');
    console.log('   → Run migration: 20250103_create_admin_roles_system.sql');
  } else {
    console.log('✅ All admin functions exist in production');
  }
})();
