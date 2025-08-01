const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Check if environment variables are loaded
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables!');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createSuperAdmin() {
  const email = 'Shannon@S2Transfers.com';
  const password = 'ZhMKhIm7$TESnvWX8@k4';
  
  console.log('Creating super admin account...');
  
  try {
    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return;
    }

    console.log('✓ Auth user created:', authData.user.id);

    // Step 2: Ensure user profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: email,
        full_name: 'Shannon',
        subscription_plan: 'free',
        subscription_status: 'active',
        is_active: true,
        is_admin: true,
        credits_remaining: 100, // Give super admin some credits
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating profile:', profileError);
      return;
    }

    console.log('✓ User profile created/updated');

    // Step 3: Check if super_admin role exists
    const { data: existingRole } = await supabase
      .from('admin_roles')
      .select('*')
      .eq('name', 'super_admin')
      .single();

    let roleId;
    if (!existingRole) {
      // Create super_admin role with all permissions
      const { data: newRole, error: roleError } = await supabase
        .from('admin_roles')
        .insert({
          name: 'super_admin',
          permissions: {
            users: {
              view: true,
              edit: true,
              delete: true,
              impersonate: true
            },
            financial: {
              view: true,
              refund: true,
              addCredits: true
            },
            system: {
              settings: true,
              maintenance: true,
              apiKeys: true
            },
            analytics: {
              view: true,
              export: true
            },
            support: {
              view: true,
              respond: true,
              assign: true
            },
            admin: {
              manage: true
            }
          },
          description: 'Full system access'
        })
        .select()
        .single();

      if (roleError) {
        console.error('Error creating role:', roleError);
        return;
      }

      roleId = newRole.id;
      console.log('✓ Super admin role created');
    } else {
      roleId = existingRole.id;
      console.log('✓ Super admin role already exists');
    }

    // Step 4: Hash the password for admin system
    const hashedPassword = await bcrypt.hash(password, 10);

    // Step 5: Create admin user
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .upsert({
        user_id: authData.user.id,
        role_id: roleId,
        two_factor_enabled: false,
        password_hash: hashedPassword,
        ip_whitelist: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (adminError) {
      console.error('Error creating admin user:', adminError);
      return;
    }

    console.log('✓ Admin user created');

    // Step 6: Log the creation
    await supabase
      .from('admin_audit_logs')
      .insert({
        admin_id: adminUser.id,
        action: 'admin.create',
        resource_type: 'admin_user',
        resource_id: adminUser.id,
        details: {
          email: email,
          role: 'super_admin',
          created_by: 'system'
        },
        ip_address: 'system'
      });

    console.log('\n✅ Super admin account created successfully!');
    console.log('Email:', email);
    console.log('Password: [hidden for security]');
    console.log('User ID:', authData.user.id);
    console.log('Admin ID:', adminUser.id);
    console.log('\nYou can now login at: /admin/login');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the script
createSuperAdmin();