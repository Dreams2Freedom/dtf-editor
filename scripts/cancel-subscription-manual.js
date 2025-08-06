const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cancelSubscription(email) {
  try {
    console.log(`\n🚫 Cancelling subscription for: ${email}`);
    
    // Find user by email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;
    
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      console.error('❌ User not found');
      return;
    }
    
    console.log(`✅ Found user: ${user.id}`);
    
    // Get current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
      
    if (profileError) throw profileError;
    
    console.log('📊 Current profile:');
    console.log('- Plan:', profile.subscription_plan || 'free');
    console.log('- Status:', profile.subscription_status || 'free');
    console.log('- Credits:', profile.credits_remaining);
    console.log('- Stripe Customer:', profile.stripe_customer_id);
    
    // Update to cancelled/free
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_plan: 'free',
        subscription_status: 'cancelled',
        subscription_canceled_at: new Date().toISOString(),
        // Keep existing credits
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
      
    if (updateError) throw updateError;
    
    console.log('✅ Subscription cancelled successfully!');
    console.log('🎉 User now has:');
    console.log('- Free plan active');
    console.log('- Status: cancelled');
    console.log('- Keeping existing credits:', profile.credits_remaining);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the cancellation
const email = process.argv[2];
if (!email) {
  console.log('Usage: node scripts/cancel-subscription-manual.js <email>');
  process.exit(1);
}

cancelSubscription(email);