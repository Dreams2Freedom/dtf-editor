/**
 * Test the fixed admin functions
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFunctions() {
  console.log('🧪 Testing Fixed Admin Functions...\n');

  try {
    // Get shannon's user ID
    const { data: users } = await supabase.auth.admin.listUsers();
    const shannon = users?.users?.find(u => u.email === 'shannon@s2transfers.com');

    if (!shannon) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ Testing for:', shannon.email);
    console.log('   User ID:', shannon.id);
    console.log('');

    // Test is_admin - using named parameter
    const { data: isAdminResult, error: adminError } = await supabase
      .rpc('is_admin', { check_user_id: shannon.id });

    console.log('1. is_admin(check_user_id):');
    if (adminError) {
      console.log('   ❌ Error:', adminError.message);
    } else {
      console.log('   ✅ Result:', isAdminResult);
    }

    // Test is_super_admin
    const { data: isSuperAdmin, error: superError } = await supabase
      .rpc('is_super_admin', { check_user_id: shannon.id });

    console.log('\n2. is_super_admin(check_user_id):');
    if (superError) {
      console.log('   ❌ Error:', superError.message);
    } else {
      console.log('   ✅ Result:', isSuperAdmin);
    }

    // Test get_admin_role
    const { data: role, error: roleError } = await supabase
      .rpc('get_admin_role', { check_user_id: shannon.id });

    console.log('\n3. get_admin_role(check_user_id):');
    if (roleError) {
      console.log('   ❌ Error:', roleError.message);
    } else {
      console.log('   ✅ Result:', role);
    }

    // Test affiliates access
    console.log('\n4. Testing affiliates table access:');
    const { data: affiliates, error: affError } = await supabase
      .from('affiliates')
      .select('id, referral_code, status')
      .limit(5);

    if (affError) {
      console.log('   ❌ Error:', affError.message);
    } else {
      console.log(`   ✅ Can access affiliates: ${affiliates.length} records`);
      affiliates.forEach(aff => {
        console.log(`      - ${aff.referral_code}: ${aff.status}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 STATUS');
    console.log('='.repeat(60));

    if (!adminError && !superError && !roleError) {
      console.log('\n✅ All functions working correctly!');
      console.log('\nNext steps:');
      console.log('  1. Hard refresh your browser (Cmd+Shift+R)');
      console.log('  2. Visit /admin/users/admins');
      console.log('  3. Visit /admin/affiliates/applications');
    } else {
      console.log('\n⚠️  Some functions have errors - check above');
    }
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testFunctions();
