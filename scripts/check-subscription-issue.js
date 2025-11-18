const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUser() {
  console.log('Checking user: hello@weprintupress.com');
  console.log('='.repeat(60));

  // Get user profile data
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'hello@weprintupress.com')
    .single();

  if (profileError) {
    console.log('Error fetching profile:', profileError);
    return;
  }

  console.log('\nUser Profile:');
  console.log('ID:', profile.id);
  console.log('Email:', profile.email);
  console.log('Subscription Status:', profile.subscription_status);
  console.log('Subscription Tier:', profile.subscription_tier);
  console.log('Stripe Customer ID:', profile.stripe_customer_id);
  console.log('Stripe Subscription ID:', profile.stripe_subscription_id);
  console.log('Credits Remaining:', profile.credits_remaining);
  console.log('Created At:', profile.created_at);

  // Check if there are multiple subscriptions in Stripe for this customer
  if (profile.stripe_customer_id) {
    console.log('\n' + '='.repeat(60));
    console.log('Checking Stripe subscriptions for customer...');
    console.log('Customer ID:', profile.stripe_customer_id);
    console.log(
      '\nPlease check Stripe dashboard for this customer to see if they have multiple subscriptions.'
    );
  }

  console.log('\n' + '='.repeat(60));
  console.log('Investigation Complete');
}

checkUser().catch(console.error);
