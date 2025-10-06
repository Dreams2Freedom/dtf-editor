const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCreditAddition() {
  const userId = 'f689bb22-89dd-4c3c-a941-d77feb84428d';

  try {
    console.log('Testing credit addition...\n');

    // Get current balance
    const { data: profileBefore } = await supabase
      .from('profiles')
      .select('credits_remaining')
      .eq('id', userId)
      .single();

    console.log('Current balance:', profileBefore.credits_remaining);

    // Add 10 credits (from the earlier purchase)
    const { error } = await supabase.rpc('add_user_credits', {
      p_user_id: userId,
      p_amount: 10,
      p_transaction_type: 'purchase',
      p_description: '10 credits purchase',
      p_metadata: {
        stripe_payment_intent_id: 'pi_3RqE2YPHFzf1GpIr29m1Wh1p',
        price_paid: 799, // $7.99 in cents
      },
    });

    if (error) {
      console.error('Error adding credits:', error);
      return;
    }

    console.log('✅ Credits added successfully!');

    // Get new balance
    const { data: profileAfter } = await supabase
      .from('profiles')
      .select('credits_remaining, total_credits_purchased')
      .eq('id', userId)
      .single();

    console.log('New balance:', profileAfter.credits_remaining);
    console.log('Total purchased:', profileAfter.total_credits_purchased);

    // Check if transaction was logged
    const { data: transactions } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (transactions && transactions.length > 0) {
      console.log('\nLatest transaction:', {
        amount: transactions[0].amount,
        type: transactions[0].type,
        balance_after: transactions[0].balance_after,
        created_at: transactions[0].created_at,
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testCreditAddition();
