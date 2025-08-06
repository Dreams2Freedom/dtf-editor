const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resubscribeUser(email) {
  try {
    console.log(`\n🔄 Re-subscribing user to Basic plan: ${email}`);
    
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
    
    // Update to Basic plan
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_plan: 'basic',
        subscription_status: 'basic',
        credits_remaining: 20, // Basic plan gives 20 credits
        subscription_canceled_at: null, // Clear cancellation date
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
      
    if (updateError) throw updateError;
    
    console.log('✅ Subscription updated to Basic plan!');
    console.log('🎉 You now have:');
    console.log('- Basic plan active');
    console.log('- 20 credits available');
    
    // Add credit transaction record
    const { error: creditError } = await supabase.rpc('add_user_credits', {
      p_user_id: user.id,
      p_amount: 19, // Add 19 to existing 1 credit = 20 total
      p_transaction_type: 'subscription',
      p_description: 'Basic plan re-subscription',
      p_metadata: {
        manual_fix: true,
        fixed_at: new Date().toISOString()
      }
    });
    
    if (creditError) {
      console.log('⚠️  Could not add credit transaction:', creditError.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the resubscription
const email = process.argv[2];
if (!email) {
  console.log('Usage: node scripts/resubscribe-user.js <email>');
  process.exit(1);
}

resubscribeUser(email);