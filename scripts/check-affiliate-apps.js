require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('=== Checking affiliate_applications table ===\n');

  const { data, error, count } = await supabase
    .from('affiliate_applications')
    .select('*', { count: 'exact' });

  if (error) {
    console.error('Error fetching applications:', error);
    process.exit(1);
  }

  console.log(`Total applications: ${count || 0}\n`);

  if (data && data.length > 0) {
    console.log('Applications:');
    data.forEach((app, i) => {
      console.log(`\n${i + 1}. Application ID: ${app.id}`);
      console.log(`   User ID: ${app.user_id}`);
      console.log(`   Status: ${app.status}`);
      console.log(`   Code: ${app.affiliate_code}`);
      console.log(`   Audience: ${app.target_audience}`);
      console.log(`   Created: ${app.created_at}`);
    });
  } else {
    console.log('No applications found in the database.');
  }

  console.log('\n=== Checking users table for admin users ===\n');

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, role, is_admin')
    .or('role.eq.admin,role.eq.super_admin,is_admin.eq.true');

  if (usersError) {
    console.error('Error fetching admin users:', usersError);
  } else {
    console.log('Admin users:', JSON.stringify(users, null, 2));
  }
})();
