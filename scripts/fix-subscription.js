const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixSubscription() {
  const userEmail = 'snsmarketing@gmail.com';
  
  // Get user
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }

  const user = users.find(u => u.email === userEmail);
  if (!user) {
    console.error('User not found');
    return;
  }

  console.log('Found user:', user.id);

  // Update subscription status
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      subscription_plan: 'basic',
      subscription_status: 'active',
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('Error updating profile:', updateError);
    return;
  }

  // Add credits for Basic plan (20 credits)
  const { error: creditError } = await supabase.rpc('add_credit_transaction', {
    p_user_id: user.id,
    p_amount: 20,
    p_type: 'subscription',
    p_description: 'Basic plan subscription'
  });

  if (creditError) {
    console.error('Error adding credits:', creditError);
    return;
  }

  console.log('Successfully updated subscription to Basic plan and added 20 credits');
}

fixSubscription();