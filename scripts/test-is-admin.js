require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('=== Testing is_admin() function ===\n');

  const userId = 'fcc1b251-6307-457c-ac1e-064aa43b2449'; // shannonherod@gmail.com

  // Test the is_admin function
  const { data, error } = await supabase.rpc('is_admin', { user_id: userId });

  if (error) {
    console.error('❌ Error calling is_admin():', error.message);
    process.exit(1);
  }

  console.log('✅ is_admin() function result:', data);

  if (data === true) {
    console.log('\n✅ SUCCESS! User is recognized as admin');
    console.log('   The admin panel should now show affiliates');
  } else {
    console.log('\n❌ FAILED! User is NOT recognized as admin');
    console.log('   There may be an issue with the is_admin function');
  }
})();
