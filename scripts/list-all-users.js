const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listAllUsers() {
  try {
    // Get all profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, is_admin, subscription_plan, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching profiles:', error);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('No profiles found in database');
      return;
    }

    console.log(`Found ${profiles.length} user(s):\n`);

    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.email}`);
      console.log(`   - ID: ${profile.id}`);
      console.log(`   - Name: ${profile.full_name || 'Not set'}`);
      console.log(`   - Admin: ${profile.is_admin ? '✅ Yes' : '❌ No'}`);
      console.log(`   - Plan: ${profile.subscription_plan || 'free'}`);
      console.log(
        `   - Created: ${new Date(profile.created_at).toLocaleDateString()}`
      );
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

console.log('Listing all users in database...\n');
listAllUsers();
