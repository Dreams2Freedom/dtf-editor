const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testUserCreation() {
  console.log('Testing user creation and authentication...\n');

  const testEmail = 'test-' + Date.now() + '@example.com';
  const testPassword = 'TestPassword123!';

  try {
    // 1. Create a test user
    console.log('1. Creating test user:', testEmail);
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return;
    }

    console.log('✓ User created successfully');
    console.log('User ID:', createData.user.id);

    // 2. Check if user exists in profiles table
    console.log('\n2. Checking profiles table...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', createData.user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    } else {
      console.log('✓ Profile found:', profile);
    }

    // 3. Try to sign in with the user
    console.log('\n3. Testing sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signInError) {
      console.error('Error signing in:', signInError);
    } else {
      console.log('✓ Sign in successful');
      console.log('Session:', signInData.session ? 'Created' : 'Not created');
    }

    // 4. List all users (first 10)
    console.log('\n4. Listing existing users...');
    const { data: users, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 10
    });

    if (listError) {
      console.error('Error listing users:', listError);
    } else {
      console.log(`Found ${users.users.length} users:`);
      users.users.forEach(user => {
        console.log(`- ${user.email} (created: ${new Date(user.created_at).toLocaleDateString()})`);
      });
    }

    // 5. Clean up - delete test user
    console.log('\n5. Cleaning up test user...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(createData.user.id);
    
    if (deleteError) {
      console.error('Error deleting test user:', deleteError);
    } else {
      console.log('✓ Test user deleted');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testUserCreation();