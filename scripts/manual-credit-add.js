const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Create a fresh client
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

async function addCreditsForLatestPayment() {
  const userId = 'f689bb22-89dd-4c3c-a941-d77feb84428d';
  const paymentIntentId = 'pi_3RqFJaPHFzf1GpIr1DcRbYip';
  
  try {
    console.log('Manually adding credits for the latest payment...\n');

    // Try using SQL directly instead of RPC
    const { data, error } = await supabase
      .rpc('add_user_credits', {
        p_user_id: userId,
        p_amount: 10,
        p_transaction_type: 'purchase',
        p_description: '10 credits purchase (manual webhook processing)',
        p_metadata: {
          stripe_payment_intent_id: paymentIntentId,
          price_paid: 799,
          added_manually: true,
          reason: 'webhook_processing_failed'
        }
      });

    if (error) {
      console.error('RPC Error:', error);
      
      // Try raw SQL as fallback
      console.log('\nTrying raw SQL approach...');
      const { data: sqlData, error: sqlError } = await supabase
        .from('profiles')
        .select('credits_remaining')
        .eq('id', userId)
        .single();
      
      if (sqlData) {
        const newBalance = sqlData.credits_remaining + 10;
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ credits_remaining: newBalance })
          .eq('id', userId);
        
        if (!updateError) {
          console.log('✅ Credits updated via direct SQL!');
          console.log('New balance:', newBalance);
        }
      }
    } else {
      console.log('✅ Credits added successfully via RPC!');
    }

    // Check new balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits_remaining')
      .eq('id', userId)
      .single();

    console.log('\nFinal balance:', profile?.credits_remaining);

  } catch (error) {
    console.error('Error:', error);
  }
}

addCreditsForLatestPayment();