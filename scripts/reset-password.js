const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetPassword(email, newPassword) {
  try {
    console.log(`\n🔑 Resetting password for: ${email}`);

    // Find user by email
    const {
      data: { users },
      error: userError,
    } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;

    const user = users.find(
      u => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (!user) {
      console.error('❌ User not found');
      return;
    }

    console.log(`✅ Found user: ${user.id}`);

    // Update password using admin API
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (error) throw error;

    console.log('✅ Password reset successfully!');
    console.log(`📧 User can now login with email: ${email}`);
    console.log('🔐 And the new password provided');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the command
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log('Usage: node scripts/reset-password.js <email> <new-password>');
  console.log(
    'Example: node scripts/reset-password.js user@example.com NewPassword123!'
  );
  process.exit(1);
}

resetPassword(email, password);
