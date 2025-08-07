const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function makeSuperAdmin(email) {
  try {
    console.log(`\n👑 Making ${email} a super admin...`);
    
    // Find user by email (case-insensitive)
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;
    
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      console.error('❌ User not found');
      return;
    }
    
    console.log(`✅ Found user: ${user.id}`);
    console.log(`📧 Email: ${user.email}`);
    
    // Check if admin_users table exists and has entry
    const { data: adminUser, error: adminCheckError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (adminCheckError && adminCheckError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine
      console.error('Error checking admin status:', adminCheckError);
      return;
    }
    
    if (adminUser) {
      // Update existing admin user to super admin
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({
          role: 'super_admin',
          permissions: ['all'],
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
        
      if (updateError) throw updateError;
      
      console.log('✅ Updated existing admin user to super admin role');
    } else {
      // Create new admin user entry
      const { error: insertError } = await supabase
        .from('admin_users')
        .insert({
          user_id: user.id,
          email: user.email,
          role: 'super_admin',
          permissions: ['all'],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (insertError) throw insertError;
      
      console.log('✅ Created new super admin user');
    }
    
    // Also update the profiles table if it has admin-related fields
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        is_admin: true,
        admin_role: 'super_admin',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
    
    if (profileError) {
      console.log('⚠️  Could not update profile admin fields (may not exist):', profileError.message);
    } else {
      console.log('✅ Updated profile admin fields');
    }
    
    console.log('\n🎉 Success! User is now a super admin with full permissions.');
    console.log('📋 Summary:');
    console.log(`   - Email: ${user.email}`);
    console.log(`   - User ID: ${user.id}`);
    console.log(`   - Role: super_admin`);
    console.log(`   - Permissions: all`);
    console.log(`   - Status: active`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === '42P01') {
      console.error('\n⚠️  The admin_users table does not exist.');
      console.error('   You may need to create the admin tables first.');
    }
  }
}

// Run the command
const email = process.argv[2];
if (!email) {
  console.log('Usage: node scripts/make-super-admin.js <email>');
  process.exit(1);
}

makeSuperAdmin(email);