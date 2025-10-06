require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('=== Verifying Admin Fix ===\n');

  const userId = 'fcc1b251-6307-457c-ac1e-064aa43b2449'; // shannonherod@gmail.com

  // Test 1: Check is_admin function
  console.log('1. Testing is_admin function:');
  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin', {
    check_user_id: userId,
  });

  if (adminError) {
    console.error('   ❌ Error:', adminError.message);
  } else {
    console.log('   ✅ is_admin result:', isAdmin);
  }

  // Test 2: Query affiliates (this is what the admin panel does)
  console.log('\n2. Testing affiliates query (service role):');
  const { data: affiliates, error: affiliatesError } = await supabase
    .from('affiliates')
    .select('*')
    .order('created_at', { ascending: false });

  if (affiliatesError) {
    console.error('   ❌ Error:', affiliatesError.message);
  } else {
    console.log('   ✅ Query successful!');
    console.log('   Total affiliates:', affiliates?.length || 0);

    if (affiliates && affiliates.length > 0) {
      console.log('\n   Applications:');
      affiliates.forEach((app, i) => {
        console.log(`   ${i + 1}. ${app.referral_code} - ${app.status}`);
      });
    }
  }

  console.log('\n=== NEXT STEPS ===');
  console.log('1. Go to: http://localhost:3000/admin/affiliates/applications');
  console.log('2. Make sure you are logged in as shannonherod@gmail.com');
  console.log('3. You should now see all affiliate applications!');
  console.log('\nIf the page still shows 0, try:');
  console.log('  - Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)');
  console.log('  - Log out and log back in');
  console.log('  - Clear browser cache');
})();
