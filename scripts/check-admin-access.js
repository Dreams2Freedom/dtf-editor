require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('=== Testing Admin Access ===\n');

  const adminUserId = 'fcc1b251-6307-457c-ac1e-064aa43b2449'; // shannonherod@gmail.com

  // Test 1: Check if is_admin function exists and works
  console.log('1. Testing is_admin function...');
  const { data: isAdminResult, error: isAdminError } = await supabase
    .rpc('is_admin', { user_id: adminUserId });

  if (isAdminError) {
    console.error('   ❌ Error calling is_admin function:', isAdminError.message);
  } else {
    console.log('   ✅ is_admin function result:', isAdminResult);
  }

  // Test 2: Check users table for role/is_admin fields
  console.log('\n2. Checking users table for admin fields...');
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email, role, is_admin')
    .eq('id', adminUserId)
    .single();

  if (userError) {
    console.error('   ❌ Error querying users table:', userError.message);
  } else {
    console.log('   ✅ User data:', JSON.stringify(userData, null, 2));
  }

  // Test 3: Check RLS policies on affiliates table
  console.log('\n3. Checking RLS policies on affiliates table...');
  const { data: policies, error: policiesError } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'affiliates';
      `
    });

  if (policiesError) {
    console.error('   ❌ Cannot query policies directly:', policiesError.message);
    console.log('   Trying alternative method...');

    // Alternative: Try to query as admin user would
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Set auth header manually (simulating logged-in admin)
    // This won't work perfectly but let's try
    console.log('\n4. Testing query AS admin user (client-side simulation)...');
    const { data: affiliatesAsUser, error: affiliatesError } = await supabase
      .from('affiliates')
      .select('*');

    if (affiliatesError) {
      console.error('   ❌ Error:', affiliatesError.message);
    } else {
      console.log('   ✅ Can query affiliates (service role):', affiliatesAsUser?.length, 'records');
    }
  } else {
    console.log('   ✅ Policies:', JSON.stringify(policies, null, 2));
  }

  // Test 4: Check profiles table for admin user
  console.log('\n5. Checking profiles table...');
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', adminUserId)
    .single();

  if (profileError) {
    console.error('   ❌ Error:', profileError.message);
  } else {
    console.log('   ✅ Profile data:', JSON.stringify(profileData, null, 2));
  }

  // Test 5: List all RLS policies
  console.log('\n6. Getting all policies from information_schema...');
  const { data: allPolicies, error: allPoliciesError } = await supabase
    .rpc('exec_sql', {
      query: `SELECT * FROM pg_policies WHERE tablename = 'affiliates';`
    });

  if (allPoliciesError) {
    console.log('   ❌ Cannot execute raw SQL:', allPoliciesError.message);
  } else {
    console.log('   ✅ Policies:', allPolicies);
  }
})();
