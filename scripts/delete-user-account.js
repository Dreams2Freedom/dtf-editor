const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteUserAccount(email) {
  console.log(`🗑️  Deleting account for: ${email}\n`);

  try {
    // Step 1: Find the user in auth.users
    const { data: authUsers, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('❌ Error fetching users:', authError);
      return;
    }

    const user = authUsers.users.find(u => u.email === email);

    if (!user) {
      console.log(`⚠️  No user found with email: ${email}`);
      return;
    }

    console.log(`✅ Found user: ${user.id}`);

    // Step 2: Delete all related data
    console.log('\n🗑️  Deleting user data...');

    // Delete processed images
    const { data: images, error: imagesError } = await supabase
      .from('processed_images')
      .delete()
      .eq('user_id', user.id)
      .select();

    if (imagesError) {
      console.error('❌ Error deleting images:', imagesError);
    } else {
      console.log(`   - Deleted ${images?.length || 0} processed images`);
    }

    // Delete credit transactions
    const { data: transactions, error: transError } = await supabase
      .from('credit_transactions')
      .delete()
      .eq('user_id', user.id)
      .select();

    if (transError) {
      console.error('❌ Error deleting transactions:', transError);
    } else {
      console.log(
        `   - Deleted ${transactions?.length || 0} credit transactions`
      );
    }

    // Delete support messages (from tickets)
    const { data: tickets } = await supabase
      .from('support_tickets')
      .select('id')
      .eq('user_id', user.id);

    if (tickets && tickets.length > 0) {
      const ticketIds = tickets.map(t => t.id);

      const { data: messages, error: msgError } = await supabase
        .from('support_messages')
        .delete()
        .in('ticket_id', ticketIds)
        .select();

      if (msgError) {
        console.error('❌ Error deleting support messages:', msgError);
      } else {
        console.log(`   - Deleted ${messages?.length || 0} support messages`);
      }
    }

    // Delete support tickets
    const { data: supportTickets, error: ticketsError } = await supabase
      .from('support_tickets')
      .delete()
      .eq('user_id', user.id)
      .select();

    if (ticketsError) {
      console.error('❌ Error deleting support tickets:', ticketsError);
    } else {
      console.log(
        `   - Deleted ${supportTickets?.length || 0} support tickets`
      );
    }

    // Step 3: Delete the profile
    console.log('\n📝 Deleting profile...');

    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (profileError) {
      console.error('❌ Error deleting profile:', profileError);
    } else {
      console.log('✅ Profile deleted');
    }

    // Step 4: Delete the auth user
    console.log('\n🔐 Deleting auth user...');

    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(
      user.id
    );

    if (deleteAuthError) {
      console.error('❌ Error deleting auth user:', deleteAuthError);
    } else {
      console.log('✅ Auth user deleted');
    }

    console.log('\n✅ Account completely deleted!');
    console.log(`   ${email} can now sign up as a brand new user`);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.log('Usage: node scripts/delete-user-account.js <email>');
    console.log(
      'Example: node scripts/delete-user-account.js shannonherod@gmail.com'
    );
    process.exit(1);
  }

  await deleteUserAccount(email);
}

main().catch(console.error);
