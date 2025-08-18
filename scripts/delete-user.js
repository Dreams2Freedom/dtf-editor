const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Check for required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('NEXT_PUBLIC_SUPABASE_URL is not set');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is not set');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function deleteUser(email) {
  try {
    console.log(`\nDeleting user: ${email}...`);
    
    // First, find the user by email
    const { data: users, error: searchError } = await supabase.auth.admin.listUsers();
    
    if (searchError) {
      console.error('Error searching for user:', searchError);
      return;
    }
    
    const user = users?.users?.find(u => u.email === email);
    
    if (!user) {
      console.log(`User ${email} not found.`);
      return;
    }
    
    console.log(`Found user with ID: ${user.id}`);
    
    // Delete the user's profile first (due to foreign key constraints)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);
    
    if (profileError) {
      console.error('Error deleting profile:', profileError);
    } else {
      console.log('Profile deleted successfully');
    }
    
    // Delete the auth user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      console.error('Error deleting user:', deleteError);
    } else {
      console.log(`User ${email} deleted successfully!`);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('Usage: node scripts/delete-user.js <email>');
  console.log('Example: node scripts/delete-user.js user@example.com');
  process.exit(1);
}

deleteUser(email).then(() => process.exit(0));