require('dotenv').config({ path: '.env.production' });
const { createClient } = require('@supabase/supabase-js');

console.log('=== Checking PRODUCTION Database ===\n');
console.log('Using Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // Test 1: Check Shannon@S2Transfers.com user ID
  console.log('1. Finding Shannon@S2Transfers.com user in PRODUCTION:');
  const { data: shannonUser, error: userError } = await supabase.auth.admin.listUsers();

  if (userError) {
    console.error('   ❌ Error listing users:', userError.message);
  } else {
    const shannon = shannonUser.users.find(u =>
      u.email?.toLowerCase() === 'shannon@s2transfers.com'
    );
    if (shannon) {
      console.log('   ✅ Found user:', shannon.email);
      console.log('   User ID:', shannon.id);
    } else {
      console.log('   ❌ Shannon@S2Transfers.com NOT found in auth.users');
    }
  }

  // Test 2: Check if is_admin function exists and works for BOTH admins
  console.log('\n2. Testing is_admin function in PRODUCTION:');
  const shannonUserId = '1596097b-8333-452a-a2bd-ea27340677ec'; // Shannon@S2Transfers.com
  const testUserId = 'fcc1b251-6307-457c-ac1e-064aa43b2449'; // shannonherod@gmail.com

  // Test Shannon@S2Transfers.com
  const { data: shannonIsAdmin, error: shannonAdminError } = await supabase
    .rpc('is_admin', { check_user_id: shannonUserId });

  console.log('   Shannon@S2Transfers.com:');
  if (shannonAdminError) {
    console.error('     ❌ Error:', shannonAdminError.message);
  } else {
    console.log('     is_admin():', shannonIsAdmin ? '✅ true' : '❌ false');
  }

  // Test shannonherod@gmail.com
  const { data: testIsAdmin, error: testAdminError } = await supabase
    .rpc('is_admin', { check_user_id: testUserId });

  console.log('   shannonherod@gmail.com:');
  if (testAdminError) {
    console.error('     ❌ Error:', testAdminError.message);
  } else {
    console.log('     is_admin():', testIsAdmin ? '✅ true' : '❌ false');
  }

  // Test 3: Check admin_users table for BOTH users
  console.log('\n3. Checking admin_users table in PRODUCTION:');

  // Shannon@S2Transfers.com
  const { data: shannonAdmin, error: shannonError } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', shannonUserId)
    .single();

  console.log('   Shannon@S2Transfers.com:');
  if (shannonError) {
    if (shannonError.code === 'PGRST116') {
      console.log('     ❌ NOT in admin_users table');
    } else {
      console.error('     ❌ Error:', shannonError.message);
    }
  } else {
    console.log('     ✅ Found in admin_users');
    console.log('     Role:', shannonAdmin.role);
    console.log('     Active:', shannonAdmin.is_active);
  }

  // shannonherod@gmail.com
  const { data: testAdmin, error: testError } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', testUserId)
    .single();

  console.log('   shannonherod@gmail.com:');
  if (testError) {
    if (testError.code === 'PGRST116') {
      console.log('     ❌ NOT in admin_users table');
    } else {
      console.error('     ❌ Error:', testError.message);
    }
  } else {
    console.log('     ✅ Found in admin_users');
    console.log('     Role:', testAdmin.role);
    console.log('     Active:', testAdmin.is_active);
  }

  // Test 4: Check affiliates exist in database
  console.log('\n4. Testing affiliates query in PRODUCTION:');
  const { data: affiliates, error: affiliatesError } = await supabase
    .from('affiliates')
    .select('*');

  if (affiliatesError) {
    console.error('   ❌ Error:', affiliatesError.message);
  } else {
    console.log('   ✅ Affiliates query works');
    console.log('   Total affiliates:', affiliates?.length || 0);
  }

  // Test 5: Check profiles.is_admin for BOTH users
  console.log('\n5. Checking profiles.is_admin in PRODUCTION:');

  // Shannon@S2Transfers.com
  const { data: shannonProfile, error: shannonProfileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', shannonUserId)
    .single();

  console.log('   Shannon@S2Transfers.com:');
  if (shannonProfileError) {
    if (shannonProfileError.code === 'PGRST116') {
      console.log('     ❌ NO profile found');
    } else {
      console.error('     ❌ Error:', shannonProfileError.message);
    }
  } else {
    console.log('     profiles.is_admin:', shannonProfile?.is_admin ? '✅ true' : '❌ false');
  }

  // shannonherod@gmail.com
  const { data: testProfile, error: testProfileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', testUserId)
    .single();

  console.log('   shannonherod@gmail.com:');
  if (testProfileError) {
    if (testProfileError.code === 'PGRST116') {
      console.log('     ❌ NO profile found');
    } else {
      console.error('     ❌ Error:', testProfileError.message);
    }
  } else {
    console.log('     profiles.is_admin:', testProfile?.is_admin ? '✅ true' : '❌ false');
  }

  console.log('\n=== SUMMARY ===');
  console.log('For Shannon@S2Transfers.com to have admin access, ALL must be true:');
  console.log('  1. User exists in auth.users');
  console.log('  2. profiles.is_admin = true OR in admin_users table');
  console.log('  3. is_admin() function returns true');
  console.log('  4. User is LOGGED IN to production');
})();
