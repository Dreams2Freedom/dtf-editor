/**
 * Debug script to check admin access issues
 * Run: node scripts/debug-admin-access.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use service role to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugAdminAccess() {
  console.log('🔍 Debugging Admin Access...\n');

  try {
    // 1. Check all users and find admins
    console.log('1. Looking for admin users:');
    const { data: users } = await supabase.auth.admin.listUsers();

    const adminEmails = ['shannon@s2transfers.com', 'shannonherod@gmail.com'];
    const adminUsers = users?.users?.filter(u => adminEmails.includes(u.email)) || [];

    console.log(`   Found ${adminUsers.length} admin user(s):`);
    adminUsers.forEach(u => {
      console.log(`   - ${u.email} (ID: ${u.id})`);
    });

    // 2. Check affiliates table directly (bypassing RLS)
    console.log('\n2. Checking affiliates table (bypassing RLS):');
    const { data: affiliates, error: affError } = await supabase
      .from('affiliates')
      .select('*');

    if (affError) {
      console.error('   Error:', affError.message);
    } else {
      console.log(`   Found ${affiliates?.length || 0} affiliate(s):`);
      if (affiliates) {
        for (const aff of affiliates) {
          // Get user email for this affiliate
          const { data: user } = await supabase.auth.admin.getUserById(aff.user_id);
          console.log(`   - Code: ${aff.referral_code}, Status: ${aff.status}, User: ${user?.email || 'Unknown'}`);
        }
      }
    }

    // 3. Test the is_admin function for each admin user
    console.log('\n3. Testing is_admin function:');
    for (const adminUser of adminUsers) {
      const { data: isAdminResult } = await supabase
        .rpc('is_admin', { user_id: adminUser.id });

      console.log(`   ${adminUser.email}: ${isAdminResult ? '✅ IS ADMIN' : '❌ NOT ADMIN'}`);
    }

    // 4. Check if RLS is enabled
    console.log('\n4. Checking RLS status:');
    const { data: tables } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .in('tablename', ['affiliates', 'referrals', 'commissions', 'payouts']);

    console.log('   Tables with potential RLS:', tables?.map(t => t.tablename).join(', '));

    // 5. Test query as if you're shannon@s2transfers.com
    console.log('\n5. Testing affiliate query for shannon@s2transfers.com:');
    const shannonUser = adminUsers.find(u => u.email === 'shannon@s2transfers.com');

    if (shannonUser) {
      // This simulates what the admin page should see
      const { data: testData, error: testError } = await supabase
        .from('affiliates')
        .select('*')
        .order('created_at', { ascending: false });

      if (testError) {
        console.log('   ❌ Query failed:', testError.message);
        console.log('   This means RLS is blocking access');
      } else {
        console.log(`   ✅ Query succeeded: ${testData?.length || 0} results`);
      }
    } else {
      console.log('   shannon@s2transfers.com not found in auth users');
    }

    // 6. Check policies
    console.log('\n6. Checking policies on affiliates table:');
    const { data: policies } = await supabase
      .from('pg_policies')
      .select('policyname, cmd')
      .eq('tablename', 'affiliates')
      .eq('schemaname', 'public');

    if (policies) {
      policies.forEach(p => {
        console.log(`   - ${p.policyname} (${p.cmd})`);
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }

  console.log('\n✨ Debug complete!');
  console.log('\n💡 If you see "RLS is blocking access", run the admin access migration.');
  console.log('   If is_admin returns false, the function needs updating.');
}

debugAdminAccess();