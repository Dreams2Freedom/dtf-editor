const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetTestUserCredits() {
  try {
    // Get free users
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

    console.log('Free users found:');
    users.forEach(user => {
      console.log(`- ${user.email}: ${user.credits_remaining} credits`);
    });

    // Reset their credits to 2
    console.log('\nResetting credits to 2 for testing...');
    const { data: updatedUsers, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        credits_remaining: 2,
        updated_at: new Date().toISOString()
      })
      .in('id', users.map(u => u.id))
      .select('id, email, credits_remaining');

    if (updateError) {
      console.error('Update error:', updateError);
      return;
    }

    console.log('\nUsers after reset:');
    updatedUsers.forEach(user => {
      console.log(`- ${user.email}: ${user.credits_remaining} credits`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

resetTestUserCredits();