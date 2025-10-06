const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetUserAccount(email) {
  console.log(`🔄 Resetting account for: ${email}\n`);

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

    // Delete notification preferences
    const { data: notifPrefs, error: notifError } = await supabase
      .from('notification_preferences')
      .delete()
      .eq('user_id', user.id)
      .select();

    if (notifError) {
      console.error('❌ Error deleting notification preferences:', notifError);
    } else {
      console.log(
        `   - Deleted ${notifPrefs?.length || 0} notification preferences`
      );
    }

    // Delete admin logs related to this user
    const { data: adminLogs, error: logsError } = await supabase
      .from('admin_logs')
      .delete()
      .eq('metadata->user_id', user.id)
      .select();

    if (logsError) {
      console.error('❌ Error deleting admin logs:', logsError);
    } else {
      console.log(`   - Deleted ${adminLogs?.length || 0} admin logs`);
    }

    // Step 3: Reset the profile to fresh state
    console.log('\n📝 Resetting profile to fresh state...');

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        credits_remaining: 2, // Free tier starting credits
        subscription_status: 'free',
        subscription_plan: 'free',
        stripe_customer_id: null,
        stripe_subscription_id: null,
        subscription_current_period_end: null,
        subscription_canceled_at: null,
        subscription_paused_until: null,
        pause_count: 0,
        last_pause_date: null,
        discount_used_count: 0,
        last_discount_date: null,
        next_eligible_discount_date: null,
        total_credits_purchased: 2,
        total_credits_used: 0,
        first_name: null,
        last_name: null,
        company: null,
        company_name: null,
        phone: null,
        notification_preferences: {
          email_tips: true,
          credit_alerts: true,
          email_updates: true,
          email_marketing: false,
          subscription_reminders: true,
        },
        last_credit_purchase_at: null,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('❌ Error resetting profile:', profileError);
    } else {
      console.log('✅ Profile reset to fresh state');
    }

    // Step 4: Clear any Stripe data (if exists)
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profile?.stripe_customer_id) {
      console.log(
        `\n⚠️  Note: Stripe customer ${profile.stripe_customer_id} still exists in Stripe`
      );
      console.log(
        '   You may want to cancel any active subscriptions in Stripe dashboard'
      );
    }

    console.log('\n✅ Account reset complete!');
    console.log('   The user can now sign up fresh and test the full workflow');
    console.log(`   Email: ${email}`);
    console.log('   Starting credits: 2');
    console.log('   Subscription: Free tier');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.log('Usage: node scripts/reset-user-account.js <email>');
    console.log(
      'Example: node scripts/reset-user-account.js shannonherod@gmail.com'
    );
    process.exit(1);
  }

  await resetUserAccount(email);
}

main().catch(console.error);
