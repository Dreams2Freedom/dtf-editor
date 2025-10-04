require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('=== Testing Affiliate Query with Service Role ===\n');

  // First, verify the function works
  const userId = 'fcc1b251-6307-457c-ac1e-064aa43b2449';
  const { data: isAdminResult } = await supabase.rpc('is_admin', { check_user_id: userId });
  console.log('is_admin(check_user_id):', isAdminResult);

  // Query affiliates with service role (should always work)
  const { data: affiliates, error } = await supabase
    .from('affiliates')
    .select('*');

  console.log('\nAffiliates query (service role):');
  console.log('  Count:', affiliates?.length || 0);
  console.log('  Error:', error?.message || 'none');

  if (affiliates && affiliates.length > 0) {
    console.log('\n  Sample:');
    console.log('    ID:', affiliates[0].id);
    console.log('    Code:', affiliates[0].referral_code);
    console.log('    Status:', affiliates[0].status);
  }

  // Now check RLS policies
  console.log('\n=== Checking RLS Policies on Affiliates Table ===');

  // We can't directly query pg_policies, but we can try to understand
  // if the policies are blocking the query from the client side

  console.log('\nThe issue might be:');
  console.log('1. The function parameter mismatch (check_user_id vs user_id)');
  console.log('2. The RLS policy might be calling is_admin(auth.uid()) with wrong param name');
  console.log('3. The client-side query might not be authenticated properly');

  console.log('\nLet me check what the affiliate admin page is doing...');
})();
