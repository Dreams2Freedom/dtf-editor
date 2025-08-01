const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addCredits(email, creditsToAdd) {
  try {
    // First, get the user by email
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id, email, credits_remaining')
      .eq('email', email)
      .single();

    if (userError) {
      console.error('Error finding user:', userError);
      return;
    }

    if (!users) {
      console.error('User not found with email:', email);
      return;
    }

    console.log('Found user:', users);
    console.log('Current credits:', users.credits_remaining);

    // Update the user's credits
    const newCredits = (users.credits_remaining || 0) + creditsToAdd;
    
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({ credits_remaining: newCredits })
      .eq('id', users.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating credits:', updateError);
      return;
    }

    console.log('\n✅ Successfully added credits!');
    console.log('Previous credits:', users.credits_remaining || 0);
    console.log('Credits added:', creditsToAdd);
    console.log('New credit balance:', updated.credits_remaining);

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the script
const email = 'snsmarketing@gmail.com';
const creditsToAdd = 500;

console.log(`Adding ${creditsToAdd} credits to ${email}...`);
addCredits(email, creditsToAdd);