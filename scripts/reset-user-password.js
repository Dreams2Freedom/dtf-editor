import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetUserPassword(email, newPassword) {
  try {
    console.log(`Resetting password for user: ${email}`);
    
    // First, get the user by email
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers();
    
    if (fetchError) {
      console.error('Error fetching users:', fetchError);
      return;
    }
    
    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      console.error(`User not found: ${email}`);
      return;
    }
    
    console.log(`Found user: ${user.id}`);
    
    // Update the user's password
    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );
    
    if (error) {
      console.error('Error updating password:', error);
      return;
    }
    
    console.log('Password updated successfully!');
    console.log('User can now log in with the new password.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Get email and password from command line arguments
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.log('Usage: node reset-user-password.js <email> <new-password>');
  console.log('Example: node reset-user-password.js user@example.com newpassword123');
  process.exit(1);
}

// Run the password reset
resetUserPassword(email, newPassword);