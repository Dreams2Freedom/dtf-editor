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
      persistSession: false,
    },
  }
);

async function deleteUser(email) {
  try {
    console.log(`\nDeleting user: ${email}...`);

    // First, find the user by email
    const { data: users, error: searchError } =
      await supabase.auth.admin.listUsers();

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

    // Delete related records first (due to foreign key constraints)

    // Delete uploads
    const { error: uploadsError } = await supabase
      .from('uploads')
      .delete()
      .eq('user_id', user.id);

    if (uploadsError) {
      console.log('No uploads to delete or error:', uploadsError?.message);
    } else {
      console.log('✅ Deleted user uploads');
    }

    // Delete credit transactions
    const { error: creditsError } = await supabase
      .from('credit_transactions')
      .delete()
      .eq('user_id', user.id);

    if (creditsError) {
      console.log(
        'No credit transactions to delete or error:',
        creditsError?.message
      );
    } else {
      console.log('✅ Deleted credit transactions');
    }

    // Delete support tickets
    const { error: ticketsError } = await supabase
      .from('support_tickets')
      .delete()
      .eq('user_id', user.id);

    if (ticketsError) {
      console.log(
        'No support tickets to delete or error:',
        ticketsError?.message
      );
    } else {
      console.log('✅ Deleted support tickets');
    }

    // Delete collections
    const { error: collectionsError } = await supabase
      .from('collections')
      .delete()
      .eq('user_id', user.id);

    if (collectionsError) {
      console.log(
        'No collections to delete or error:',
        collectionsError?.message
      );
    } else {
      console.log('✅ Deleted collections');
    }

    // Delete email notifications
    const { error: emailNotifError } = await supabase
      .from('email_notifications')
      .delete()
      .eq('user_id', user.id);

    if (emailNotifError) {
      console.log(
        'No email notifications to delete or error:',
        emailNotifError?.message
      );
    } else {
      console.log('✅ Deleted email notifications');
    }

    // Delete the user's profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (profileError) {
      console.error('Error deleting profile:', profileError);
    } else {
      console.log('✅ Profile deleted successfully');
    }

    // Delete the auth user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(
      user.id
    );

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
    } else {
      console.log(`\n✅ User ${email} deleted successfully!`);
      console.log('You can now test the signup process with this email.');
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
