const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testBulkCredits() {
  try {
    // Get two free users
    const { data: users, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, credits_remaining')
      .eq('subscription_plan', 'free')
      .eq('is_admin', false)
      .limit(2);

    if (fetchError) {
      console.error('Error fetching users:', fetchError);
      return;
    }

    if (!users || users.length < 2) {
      console.log('Not enough free users found');
      return;
    }

    console.log('Testing bulk credit addition for users:');
    users.forEach(user => {
      console.log(`- ${user.email}: ${user.credits_remaining} credits`);
    });

    const userIds = users.map(u => u.id);
    const creditAmount = 2;

    // Test adding credits
    console.log(`\nAdding ${creditAmount} credits to each user...`);
    
    // Update credits directly
    const { data: updatedUsers, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        credits_remaining: users[0].credits_remaining + creditAmount,
        updated_at: new Date().toISOString()
      })
      .in('id', userIds)
      .select('id, email, credits_remaining');

    if (updateError) {
      console.error('Update error:', updateError);
      return;
    }

    console.log('\nUpdated users:');
    updatedUsers.forEach(user => {
      console.log(`- ${user.email}: ${user.credits_remaining} credits`);
    });

    // Also test the RPC function if it exists
    console.log('\nTesting add_credits_bulk RPC...');
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('add_credits_bulk', {
        user_ids: userIds,
        credit_amount: creditAmount
      });

    if (rpcError) {
      console.log('RPC error (function may not exist):', rpcError.message);
    } else {
      console.log('RPC result:', rpcResult);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testBulkCredits();