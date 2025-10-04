require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const userId = 'fcc1b251-6307-457c-ac1e-064aa43b2449';

  console.log('=== Trying different ways to call is_admin ===\n');

  // Try 1: Named parameter "user_id"
  console.log('1. Trying with named parameter "user_id":');
  let { data, error } = await supabase.rpc('is_admin', { user_id: userId });
  console.log('   Result:', data, 'Error:', error?.message || 'none');

  // Try 2: Named parameter "check_user_id" (from the error message)
  console.log('\n2. Trying with named parameter "check_user_id":');
  ({ data, error } = await supabase.rpc('is_admin', { check_user_id: userId }));
  console.log('   Result:', data, 'Error:', error?.message || 'none');

  // Try 3: Get function definition from database
  console.log('\n3. Querying pg_proc for function definition:');
  const { data: funcData, error: funcError } = await supabase
    .from('pg_proc')
    .select('*')
    .ilike('proname', 'is_admin');

  if (funcError) {
    console.log('   Cannot query pg_proc:', funcError.message);
  } else {
    console.log('   Functions found:', funcData);
  }
})();
