const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function deleteUserCompletely() {
  try {
    // First find the user
    const { data: profile, error: findError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'shannonherod@gmail.com')
      .single();
    
    if (findError || !profile) {
      console.log('User not found in database');
      return;
    }
    
    console.log('Found user:', {
      id: profile.id,
      email: profile.email,
      stripe_customer_id: profile.stripe_customer_id,
      stripe_subscription_id: profile.stripe_subscription_id
    });
    
    // Delete Stripe subscription if exists
    if (profile.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(profile.stripe_subscription_id);
        console.log('✅ Stripe subscription cancelled');
      } catch (err) {
        console.log('Subscription already cancelled or not found');
      }
    }
    
    // Delete Stripe customer if exists
    if (profile.stripe_customer_id) {
      try {
        await stripe.customers.del(profile.stripe_customer_id);
        console.log('✅ Stripe customer deleted');
      } catch (err) {
        console.log('Customer already deleted or not found');
      }
    }
    
    // Delete from Supabase auth
    const { error: deleteError } = await supabase.auth.admin.deleteUser(profile.id);
    
    if (deleteError) {
      console.error('Error deleting user:', deleteError);
    } else {
      console.log('✅ User deleted from Supabase auth (profile cascades)');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

deleteUserCompletely();