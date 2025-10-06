const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Check if environment variables are loaded
if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  console.error('Missing required environment variables!');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAdminStatus() {
  console.log('🔍 Checking admin status for all users...\n');

  try {
    // Get all profiles with is_admin field
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, is_admin, created_at, last_activity_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching profiles:', error.message);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('No profiles found.');
      return;
    }

    console.log('👤 User Admin Status:\n');
    profiles.forEach((profile, index) => {
      console.log(`   ${index + 1}. ${profile.email}`);
      console.log(`      ID: ${profile.id}`);
      console.log(`      Name: ${profile.full_name || 'Not set'}`);
      console.log(`      Is Admin: ${profile.is_admin ? '✅ YES' : '❌ NO'}`);
      console.log(`      Created: ${profile.created_at}`);
      console.log(
        `      Last Activity: ${profile.last_activity_at || 'Never'}`
      );
      console.log('');
    });

    // Count admins
    const adminCount = profiles.filter(p => p.is_admin).length;
    console.log(
      `\n📊 Summary: ${adminCount} admin(s) out of ${profiles.length} total users`
    );

    // Check specific user if email provided as argument
    const targetEmail = process.argv[2];
    if (targetEmail) {
      console.log(`\n🔍 Looking for specific user: ${targetEmail}`);
      const user = profiles.find(
        p => p.email.toLowerCase() === targetEmail.toLowerCase()
      );
      if (user) {
        console.log(`\n✅ Found user: ${user.email}`);
        console.log(
          `   Admin status: ${user.is_admin ? '✅ IS ADMIN' : '❌ NOT ADMIN'}`
        );

        if (!user.is_admin) {
          console.log('\n📝 To make this user an admin, run:');
          console.log(`   node scripts/create-simple-admin.js`);
          console.log('   OR update directly in Supabase dashboard');
        }
      } else {
        console.log(`\n❌ User not found: ${targetEmail}`);
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the check
checkAdminStatus();
