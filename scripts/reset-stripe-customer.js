const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetStripeCustomer(email) {
  try {
    console.log(`\n🔄 Resetting Stripe customer for: ${email}`);
    
    // Find user by email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;
    
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      console.error('❌ User not found');
      return;
    }
    
    console.log(`✅ Found user: ${user.id}`);
    
    // Clear Stripe customer ID to force new customer creation
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        stripe_customer_id: null,
        stripe_subscription_id: null,
        subscription_plan: 'free',
        subscription_status: 'free',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
      
    if (updateError) throw updateError;
    
    console.log('✅ Stripe customer data cleared!');
    console.log('🎯 Next steps:');
    console.log('1. Try subscribing again - it will create a new customer in test mode');
    console.log('2. Check Stripe dashboard in test mode for the new customer');
    console.log('3. The webhook should properly update your subscription');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the reset
const email = process.argv[2];
if (!email) {
  console.log('Usage: node scripts/reset-stripe-customer.js <email>');
  process.exit(1);
}

resetStripeCustomer(email);