const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSuperAdmin(email) {
  try {
    console.log(`\n👑 Creating super admin for: ${email}`);

    // Check if admin tables exist
    const { data: testRoles, error: testError } = await supabase
      .from('admin_roles')
      .select('*')
      .limit(1);

    if (testError && testError.code === '42P01') {
      console.log('\n❌ Admin tables do not exist in the database.');
      console.log('   The admin system has not been set up yet.');
      console.log('\n📝 For now, adding basic admin flag to profiles table...');

      // Fallback: Just update the profiles table
      const {
        data: { users },
        error: userError,
      } = await supabase.auth.admin.listUsers();
      if (userError) throw userError;

      const user = users.find(
        u => u.email?.toLowerCase() === email.toLowerCase()
      );
      if (!user) {
        console.error('❌ User not found');
        return;
      }

      // Update or create profile with admin flag
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            is_admin: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (updateError) throw updateError;
        console.log('✅ Updated profile with admin flag');
      } else {
        const { error: insertError } = await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          is_admin: true,
          credits_remaining: 1000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (insertError) throw insertError;
        console.log('✅ Created profile with admin flag');
      }

      console.log(`\n🎉 ${email} now has admin access!`);
      console.log(
        '   Note: This is a basic admin flag. The full admin system is not yet deployed.'
      );
      return;
    }

    // If admin tables exist, use the proper system
    const { data: roles } = await supabase
      .from('admin_roles')
      .select('*')
      .eq('name', 'super_admin')
      .single();

    if (!roles) {
      console.error('❌ super_admin role not found in admin_roles table');
      return;
    }

    // Get user
    const {
      data: { users },
      error: userError,
    } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;

    const user = users.find(
      u => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (!user) {
      console.error('❌ User not found');
      return;
    }

    // Check if already admin
    const { data: existingAdmin } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existingAdmin) {
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({
          role_id: roles.id,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;
      console.log('✅ Updated existing admin to super_admin role');
    } else {
      const { error: insertError } = await supabase.from('admin_users').insert({
        user_id: user.id,
        role_id: roles.id,
        is_active: true,
      });

      if (insertError) throw insertError;
      console.log('✅ Created new super_admin user');
    }

    console.log(`\n🎉 ${email} is now a super admin with full system access!`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the command
const email = process.argv[2];
if (!email) {
  console.log('Usage: node scripts/create-super-admin.js <email>');
  process.exit(1);
}

createSuperAdmin(email);
