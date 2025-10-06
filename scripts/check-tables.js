require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('=== Checking for affiliates table ===\n');

  // Try to query the affiliates table
  const { data, error, count } = await supabase
    .from('affiliates')
    .select('*', { count: 'exact' })
    .limit(5);

  if (error) {
    console.error('❌ Error querying affiliates table:', error.message);
    console.log(
      '\nThe affiliates table does not exist. Migration needs to be applied.'
    );
  } else {
    console.log('✅ Affiliates table exists!');
    console.log(`   Total records: ${count || 0}`);

    if (data && data.length > 0) {
      console.log('\nSample records:');
      data.forEach((record, i) => {
        console.log(`\n${i + 1}. ID: ${record.id}`);
        console.log(`   User ID: ${record.user_id}`);
        console.log(`   Code: ${record.referral_code}`);
        console.log(`   Status: ${record.status}`);
      });
    } else {
      console.log('\nNo records in the table yet.');
    }
  }

  console.log('\n=== Checking auth.users table ===\n');

  // Check if current user exists and their admin status
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    console.log('Current user:', user.email);
    console.log('User ID:', user.id);
  } else {
    console.log('No authenticated user - using service role');
  }

  // Try to check users table
  const { data: users, error: usersError } = await supabase
    .rpc('get_admin_user', { user_email: 'shannonherod@gmail.com' })
    .limit(1);

  if (usersError) {
    console.log('Cannot check admin status via RPC, trying direct query...');

    // Direct query using service role
    const { data: authUsers, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error listing users:', authError.message);
    } else {
      const adminUser = authUsers.users.find(
        u => u.email === 'shannonherod@gmail.com'
      );
      if (adminUser) {
        console.log('\nAdmin user found:');
        console.log('  Email:', adminUser.email);
        console.log('  ID:', adminUser.id);
        console.log(
          '  Metadata:',
          JSON.stringify(adminUser.user_metadata, null, 2)
        );
      }
    }
  }
})();
