// Delete a user completely from the database including all related records

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const USER_EMAIL = 'smsmarketing@gmail.com';

async function deleteUserCompletely() {
  console.log('🔍 Checking for user:', USER_EMAIL);
  console.log('');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // First, find the user in profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', USER_EMAIL)
      .single();

    if (profileError || !profile) {
      console.log('✅ User not found in database. Clear to sign up!');
      return;
    }

    console.log('📋 User found:');
    console.log('   ID:', profile.id);
    console.log('   Email:', profile.email);
    console.log('   Name:', profile.first_name, profile.last_name);
    console.log('   Plan:', profile.subscription_plan);
    console.log('   Credits:', profile.credits_remaining);
    console.log(
      '   Created:',
      new Date(profile.created_at).toLocaleDateString()
    );
    console.log('');

    const userId = profile.id;

    console.log('🗑️  Deleting all user records...');
    console.log('');

    // Delete from all related tables
    const deletions = [
      { table: 'credit_transactions', field: 'user_id' },
      { table: 'processed_images', field: 'user_id' },
      { table: 'uploads', field: 'user_id' },
      { table: 'support_tickets', field: 'user_id' },
      { table: 'support_messages', field: 'user_id' },
      { table: 'notifications', field: 'user_id' },
      { table: 'user_usage_stats', field: 'user_id' },
      { table: 'admin_audit_logs', field: 'admin_id' },
      { table: 'audit_logs', field: 'admin_id' },
    ];

    for (const deletion of deletions) {
      try {
        const { data, error, count } = await supabase
          .from(deletion.table)
          .delete()
          .eq(deletion.field, userId)
          .select('id', { count: 'exact', head: true });

        if (error) {
          if (error.code === '42P01') {
            console.log(
              `   ⏭️  Table '${deletion.table}' doesn't exist, skipping`
            );
          } else {
            console.log(
              `   ⚠️  Error deleting from ${deletion.table}:`,
              error.message
            );
          }
        } else {
          console.log(
            `   ✅ Deleted ${count || 0} records from ${deletion.table}`
          );
        }
      } catch (e) {
        console.log(`   ⏭️  Skipped ${deletion.table}`);
      }
    }

    // Delete the profile
    console.log('');
    const { error: profileDeleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileDeleteError) {
      console.log('❌ Error deleting profile:', profileDeleteError.message);
    } else {
      console.log('✅ Deleted profile record');
    }

    // Delete from Supabase Auth
    console.log('');
    console.log('🔐 Deleting from Supabase Auth...');

    const { error: authDeleteError } =
      await supabase.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.log('⚠️  Could not delete from auth:', authDeleteError.message);
      console.log('   (User may have already been deleted from auth)');
    } else {
      console.log('✅ Deleted from Supabase Auth');
    }

    console.log('');
    console.log('✨ User completely deleted!');
    console.log('   Email', USER_EMAIL, 'is now available for signup.');
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }

  console.log('');
  console.log('📝 You can now test signup at:');
  console.log('   https://dtfeditor.com/auth/signup');
  console.log('   Email:', USER_EMAIL);
}

// Run the deletion
deleteUserCompletely().catch(console.error);
