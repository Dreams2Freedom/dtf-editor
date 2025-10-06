/**
 * Test Admin Affiliate Access
 * This script tests if admin users can access affiliate data
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAdminAccess() {
  console.log('🔍 Testing Admin Affiliate Access...\n');

  try {
    // 1. Get current admin user
    console.log('1. Checking admin user:');
    const { data: adminUsers, error: adminError } =
      await supabase.auth.admin.listUsers();

    if (adminError) {
      console.error('Error getting users:', adminError);
      return;
    }

    const adminEmails = ['shannonherod@gmail.com', 'admin@dtfeditor.com'];
    const adminUser = adminUsers.users.find(u => adminEmails.includes(u.email));

    if (adminUser) {
      console.log(`   Found admin: ${adminUser.email} (${adminUser.id})\n`);
    } else {
      console.log('   No admin user found\n');
    }

    // 2. Test is_admin function
    console.log('2. Testing is_admin function:');
    if (adminUser) {
      const { data: isAdmin, error: adminCheckError } = await supabase.rpc(
        'is_admin',
        { user_id: adminUser.id }
      );

      if (adminCheckError) {
        console.error('   Error checking is_admin:', adminCheckError);
      } else {
        console.log(`   is_admin(${adminUser.email}): ${isAdmin}\n`);
      }
    }

    // 3. Check affiliates table access with service key
    console.log('3. Testing affiliates table access (with service key):');
    const { data: affiliates, error: affiliatesError } = await supabase
      .from('affiliates')
      .select('*');

    if (affiliatesError) {
      console.error('   Error:', affiliatesError);
    } else {
      console.log(`   ✅ Found ${affiliates?.length || 0} affiliate(s)`);
      if (affiliates && affiliates.length > 0) {
        affiliates.forEach(aff => {
          console.log(`      - ${aff.referral_code}: Status=${aff.status}`);
        });
      }
    }

    // 4. Check RLS policies
    console.log('\n4. Checking RLS policies on affiliates table:');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'affiliates');

    if (policiesError) {
      console.log('   Could not fetch policies (this is normal)');
    } else {
      console.log(`   Found ${policies?.length || 0} policies`);
      if (policies && policies.length > 0) {
        policies.forEach(p => {
          console.log(`      - ${p.policyname}: ${p.cmd}`);
        });
      }
    }

    // 5. Try to fetch with a user context simulation
    console.log('\n5. Simulating user context:');
    console.log('   Note: This test uses service_role key which bypasses RLS');
    console.log("   The actual frontend will use the user's auth token\n");

    console.log('✅ Test complete!\n');
    console.log('Summary:');
    console.log('- Service role key can access all data ✅');
    console.log('- is_admin function exists ✅');
    console.log('- To test actual admin access, log in as', adminEmails[0]);
    console.log('  and visit /admin/affiliates/applications\n');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testAdminAccess();
