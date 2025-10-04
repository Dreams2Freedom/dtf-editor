require('dotenv').config({ path: '.env.production' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('Checking RLS policies on affiliate tables...\n');

  // Query the pg_policies view to see what policies exist
  const { data: policies, error } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN ('affiliates', 'referrals', 'commissions', 'payouts')
        ORDER BY tablename, policyname;
      `
    });

  if (error) {
    console.error('Error:', error.message);
    console.log('\nTrying alternative method...\n');

    // Try a simpler check - just test if admin can access
    const userId = '1596097b-8333-452a-a2bd-ea27340677ec';

    console.log('Testing admin access with profiles.is_admin check:\n');

    // Check profiles.is_admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    console.log('1. profiles.is_admin:', profile?.is_admin ? '✅ true' : '❌ false');

    // Try to fetch affiliates (this should work if RLS policies are correct)
    const { data: affiliates, error: affError } = await supabase
      .from('affiliates')
      .select('*');

    console.log('\n2. Fetching affiliates (service role, bypasses RLS):');
    if (affError) {
      console.error('   ❌ Error:', affError.message);
    } else {
      console.log('   ✅ Found', affiliates?.length || 0, 'affiliates');
    }
  } else {
    console.log('Policies found:');
    console.log(JSON.stringify(policies, null, 2));
  }
})();
