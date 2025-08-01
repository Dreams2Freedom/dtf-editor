const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Check if environment variables are loaded
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables!');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAdminAccount() {
  const email = 'Shannon@S2Transfers.com';
  const password = 'ZhMKhIm7$TESnvWX8@k4';
  
  console.log('Creating admin account...');
  
  try {
    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });

    if (authError) {
      if (authError.message.includes('already been registered') || authError.code === 'email_exists') {
        console.log('User already exists in auth, continuing...');
        
        // Get existing user
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (existingUser) {
          await updateProfile(existingUser.id, email);
        }
      } else {
        console.error('Error creating auth user:', authError);
        return;
      }
    } else {
      console.log('✓ Auth user created:', authData.user.id);
      await updateProfile(authData.user.id, email);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

async function updateProfile(userId, email) {
  // Step 2: Update user profile to be admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: email,
      full_name: 'Shannon',
      subscription_plan: 'starter', // Give admin a good plan
      subscription_status: null, // Let it be null for now
      is_active: true,
      is_admin: true, // Make them admin
      credits_remaining: 1000, // Give admin lots of credits
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (profileError) {
    console.error('Error updating profile:', profileError);
    return;
  }

  console.log('✓ User profile updated as admin');
  console.log('\n✅ Admin account created successfully!');
  console.log('Email:', email);
  console.log('Password: [hidden for security]');
  console.log('User ID:', userId);
  console.log('Credits: 1000');
  console.log('Plan: Starter');
  console.log('Admin: Yes');
  console.log('\nYou can now login at: /admin/login');
  console.log('\nNote: The admin dashboard will work with the is_admin flag.');
  console.log('Full role-based admin system tables need to be created separately.');
}

// Run the script
createAdminAccount();