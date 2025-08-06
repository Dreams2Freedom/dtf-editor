const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateCredits(email, newCredits) {
  try {
    console.log(`\n💳 Updating credits for: ${email}`);
    
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
    
    console.log('📊 Current credits:', profile.credits_remaining);
    
    // Update credits
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        credits_remaining: newCredits,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
      
    if (updateError) throw updateError;
    
    console.log(`✅ Credits updated successfully!`);
    console.log(`📊 New credits: ${newCredits}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the update
const email = process.argv[2];
const credits = parseInt(process.argv[3]);

if (!email || isNaN(credits)) {
  console.log('Usage: node scripts/update-user-credits.js <email> <credits>');
  console.log('Example: node scripts/update-user-credits.js user@example.com 10');
  process.exit(1);
}

updateCredits(email, credits);