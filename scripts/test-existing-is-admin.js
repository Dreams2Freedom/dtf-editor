require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('=== Testing EXISTING is_admin() function ===\n');

  const userId = 'fcc1b251-6307-457c-ac1e-064aa43b2449'; // shannonherod@gmail.com

  // Test the existing is_admin function
  const { data, error } = await supabase.rpc('is_admin', { user_id: userId });

  if (error) {
    console.error('❌ Error calling is_admin():', error.message);
    console.log(
      '\nThis means the function signature is different than expected.'
    );
  } else {
    console.log('✅ is_admin() function returned:', data);

    if (data === true) {
      console.log('\n✅ GREAT! The existing function recognizes you as admin!');
      console.log('   This means the function checks profiles.is_admin');
      console.log('   And you have profiles.is_admin = true');
      console.log('\n   The affiliate policies SHOULD work...');
      console.log("   Let me check if there's a different issue...");
    } else {
      console.log('\n❌ The function returned false');
      console.log('   Your profiles.is_admin might not be set correctly');
    }
  }

  // Check profiles.is_admin
  console.log('\n=== Checking profiles.is_admin ===');
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  console.log('profiles.is_admin:', profile?.is_admin);
})();
