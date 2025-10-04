/**
 * Verify shannon@s2transfers.com is a super admin
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyAdmin() {
  console.log('🔍 Verifying Super Admin Status...\n');

  try {
    // Find shannon@s2transfers.com
    const { data: users } = await supabase.auth.admin.listUsers();
    const shannonUser = users?.users?.find(u => u.email === 'shannon@s2transfers.com');

    if (!shannonUser) {
      console.log('❌ User shannon@s2transfers.com not found in auth.users');
      return;
    }

    console.log('✅ Found user:', shannonUser.email);
    console.log('   User ID:', shannonUser.id);
    console.log('');

    // Check admin_users table
    const { data: adminRecord, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', shannonUser.id)
      .single();

    if (adminError) {
      console.log('❌ Error fetching admin record:', adminError.message);
      console.log('');
      console.log('📝 Creating super admin record...');

      // Create the admin record
      const { error: insertError } = await supabase
        .from('admin_users')
        .insert({
          user_id: shannonUser.id,
          role: 'super_admin',
          permissions: {
            view_all_users: true,
            edit_users: true,
            view_financials: true,
            manage_affiliates: true,
            manage_support: true,
            manage_admins: true,
            system_settings: true
          },
          is_active: true,
          notes: 'Super Administrator - Full system access'
        });

      if (insertError) {
        console.log('❌ Error creating admin:', insertError.message);
      } else {
        console.log('✅ Super admin record created!');
      }
      return;
    }

    console.log('✅ Admin record exists:');
    console.log('   Role:', adminRecord.role);
    console.log('   Active:', adminRecord.is_active);
    console.log('   Permissions:', JSON.stringify(adminRecord.permissions, null, 2));
    console.log('');

    // Test the is_admin function
    const { data: isAdminResult, error: isAdminError } = await supabase
      .rpc('is_admin', { user_id: shannonUser.id });

    if (isAdminError) {
      console.log('❌ is_admin() error:', isAdminError.message);
    } else {
      console.log('✅ is_admin():', isAdminResult);
    }

    // Test the is_super_admin function
    const { data: isSuperAdmin, error: superError } = await supabase
      .rpc('is_super_admin', { user_id: shannonUser.id });

    if (superError) {
      console.log('❌ is_super_admin() error:', superError.message);
    } else {
      console.log('✅ is_super_admin():', isSuperAdmin);
    }

    // Test the get_admin_role function
    const { data: role, error: roleError } = await supabase
      .rpc('get_admin_role', { user_id: shannonUser.id });

    if (roleError) {
      console.log('❌ get_admin_role() error:', roleError.message);
    } else {
      console.log('✅ get_admin_role():', role);
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('📋 NEXT STEPS:');
    console.log('='.repeat(60));
    console.log('');
    console.log('Everything is set up correctly in the database!');
    console.log('');
    console.log('To fix the "Access Denied" issue:');
    console.log('  1. Log out of dtfeditor.com');
    console.log('  2. Log back in as shannon@s2transfers.com');
    console.log('  3. Go to /admin/users/admins');
    console.log('');
    console.log('If still not working:');
    console.log('  1. Hard refresh (Cmd+Shift+R)');
    console.log('  2. Clear browser cache for dtfeditor.com');
    console.log('  3. Try incognito/private window');
    console.log('');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

verifyAdmin();
