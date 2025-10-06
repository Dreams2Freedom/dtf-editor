const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsers() {
  console.log('🔍 Checking existing users...\n');

  try {
    // Check auth.users table using admin API
    const { data: authUsers, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('❌ Error fetching auth.users:', authError);
    } else {
      console.log('📧 Auth Users:');
      if (authUsers && authUsers.users && authUsers.users.length > 0) {
        authUsers.users.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.email}`);
          console.log(`      ID: ${user.id}`);
          console.log(`      Created: ${user.created_at}`);
          console.log(
            `      Email Confirmed: ${user.email_confirmed_at || 'No'}`
          );
          console.log(`      Last Sign In: ${user.last_sign_in_at || 'Never'}`);
          console.log('');
        });
      } else {
        console.log('   No users found in auth.users');
      }
    }

    // Check profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select(
        'id, email, first_name, last_name, credits_remaining, subscription_status, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(10);

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
    } else {
      console.log('👤 Profiles:');
      if (profiles && profiles.length > 0) {
        profiles.forEach((profile, index) => {
          console.log(`   ${index + 1}. ${profile.email}`);
          console.log(`      ID: ${profile.id}`);
          console.log(
            `      Name: ${profile.first_name || 'N/A'} ${profile.last_name || 'N/A'}`
          );
          console.log(`      Credits: ${profile.credits_remaining}`);
          console.log(`      Subscription: ${profile.subscription_status}`);
          console.log(`      Created: ${profile.created_at}`);
          console.log('');
        });
      } else {
        console.log('   No profiles found');
      }
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function createTestUser() {
  console.log('🔧 Creating test user...\n');

  const testEmail = 'test@example.com';
  const testPassword = 'testpassword123';

  try {
    // Create user in auth.users
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
        user_metadata: {
          first_name: 'Test',
          last_name: 'User',
          company: 'Test Company',
        },
      });

    if (authError) {
      console.error('❌ Error creating auth user:', authError);
      return;
    }

    console.log('✅ Auth user created successfully');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    console.log(`   User ID: ${authData.user.id}`);

    // Check if profile was created automatically
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.log('⚠️  Profile not found, creating manually...');

      // Create profile manually
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: testEmail,
          first_name: 'Test',
          last_name: 'User',
          company: 'Test Company',
          credits_remaining: 5,
          subscription_status: 'free',
          subscription_plan: 'free',
          is_admin: false,
        });

      if (createProfileError) {
        console.error('❌ Error creating profile:', createProfileError);
      } else {
        console.log('✅ Profile created successfully');
      }
    } else {
      console.log('✅ Profile created automatically');
    }

    console.log('\n🎉 Test user created successfully!');
    console.log('   You can now login with:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  }
}

async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'check':
      await checkUsers();
      break;
    case 'create':
      await createTestUser();
      break;
    default:
      console.log('Usage:');
      console.log(
        '  node scripts/check-users.js check    - Check existing users'
      );
      console.log(
        '  node scripts/check-users.js create   - Create a test user'
      );
      break;
  }
}

main().catch(console.error);
