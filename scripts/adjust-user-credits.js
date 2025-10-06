const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function adjustUserCredits(email, adjustment, reason) {
  try {
    // First, find the user
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

    console.log(`Found user: ${user.id}`);

    // Get current credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits_remaining')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return;
    }

    const currentCredits = profile.credits_remaining || 0;
    const newCredits = currentCredits + adjustment;

    console.log(`Current credits: ${currentCredits}`);
    console.log(`Adjustment: ${adjustment > 0 ? '+' : ''}${adjustment}`);
    console.log(`New credits: ${newCredits}`);
    console.log(`Reason: ${reason}`);

    // Update credits
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits_remaining: newCredits })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating credits:', updateError);
      return;
    }

    // Log the transaction
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        amount: adjustment,
        transaction_type: adjustment > 0 ? 'admin_add' : 'admin_deduct',
        description: reason,
        metadata: {
          admin_action: true,
          timestamp: new Date().toISOString(),
        },
      });

    if (transactionError) {
      console.log('Note: Could not log transaction (table might not exist)');
    }

    console.log(`\n✅ Successfully adjusted credits for ${email}`);
    console.log(`   ${currentCredits} → ${newCredits} credits`);
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Get arguments
const email = process.argv[2];
const adjustment = parseInt(process.argv[3]);
const reason = process.argv[4] || 'Manual adjustment';

if (!email || isNaN(adjustment)) {
  console.log(
    'Usage: node scripts/adjust-user-credits.js <email> <adjustment> [reason]'
  );
  console.log(
    'Example: node scripts/adjust-user-credits.js user@example.com -10 "Correcting duplicate credit allocation"'
  );
  console.log(
    'Example: node scripts/adjust-user-credits.js user@example.com 5 "Compensation for issue"'
  );
  process.exit(1);
}

adjustUserCredits(email, adjustment, reason).then(() => process.exit(0));
