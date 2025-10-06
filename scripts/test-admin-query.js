require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Create a client as the admin user would use it
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
  console.log('=== Testing Admin Query (as shannonherod@gmail.com) ===\n');

  // Sign in as the admin user
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: 'shannonherod@gmail.com',
      password: 'Test1234!!', // You'll need to provide the correct password
    });

  if (authError) {
    console.error('❌ Error signing in:', authError.message);
    console.log('\n⚠️  Cannot test with actual user auth');
    console.log('   Please provide the password for shannonherod@gmail.com');
    process.exit(1);
  }

  console.log('✅ Signed in as:', authData.user.email);
  console.log('   User ID:', authData.user.id);

  // Try to query affiliates
  const { data, error, count } = await supabase
    .from('affiliates')
    .select('*', { count: 'exact' });

  if (error) {
    console.error('\n❌ Error querying affiliates:', error.message);
    console.log('\n   This confirms the RLS policies are blocking the query');
    console.log('   The is_admin() function is not working');
  } else {
    console.log('\n✅ SUCCESS! Affiliates query worked');
    console.log('   Total records:', count);
    console.log('   Records:', data?.length);

    if (data && data.length > 0) {
      console.log('\nSample record:');
      console.log('   ID:', data[0].id);
      console.log('   Code:', data[0].referral_code);
      console.log('   Status:', data[0].status);
    }
  }

  // Clean up
  await supabase.auth.signOut();
})();
