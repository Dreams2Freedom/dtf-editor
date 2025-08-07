const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function makeAdmin(email) {
  try {
    console.log(`\n👑 Making ${email} an admin...`);
    
    // Find user by email (case-insensitive)
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;
    
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      console.error('❌ User not found');
      return;
    }
    
    console.log(`✅ Found user: ${user.id}`);
    
    // Check if profile exists
    const { data: profile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileCheckError && profileCheckError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          is_admin: true,
          admin_role: 'super_admin',
          credits_remaining: 1000, // Give admin lots of credits
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (insertError) throw insertError;
      console.log('✅ Created admin profile with super_admin role');
    } else if (profile) {
      // Update existing profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          is_admin: true,
          admin_role: 'super_admin',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      console.log('✅ Updated existing profile to super_admin');
    } else if (profileCheckError) {
      throw profileCheckError;
    }
    
    console.log('\n🎉 Success! User is now a super admin.');
    console.log('📋 Summary:');
    console.log(`   - Email: ${user.email}`);
    console.log(`   - User ID: ${user.id}`);
    console.log(`   - Admin Status: true`);
    console.log(`   - Admin Role: super_admin`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the command
const email = process.argv[2];
if (!email) {
  console.log('Usage: node scripts/update-admin-status.js <email>');
  process.exit(1);
}

makeAdmin(email);