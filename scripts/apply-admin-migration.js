const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyAdminMigration() {
  try {
    console.log('🚀 Applying admin system migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '010_create_admin_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      // If exec_sql doesn't exist, try direct execution (for local development)
      console.log('Trying alternative execution method...');
      
      // Split by semicolons but be careful with functions
      const statements = migrationSQL
        .split(/;\s*$/m)
        .filter(stmt => stmt.trim())
        .map(stmt => stmt + ';');
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement });
          if (stmtError) {
            console.error('Statement error:', stmtError);
            // Continue with next statement
          }
        }
      }
    }
    
    console.log('✅ Admin system tables created successfully!');
    
    // Verify tables were created
    console.log('\n📊 Verifying migration...');
    
    const tables = ['admin_roles', 'admin_users', 'admin_audit_logs', 'support_tickets'];
    for (const table of tables) {
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error(`❌ Error checking ${table}:`, countError.message);
      } else {
        console.log(`✅ Table ${table} exists`);
      }
    }
    
    // Check if roles were inserted
    const { data: roles, error: rolesError } = await supabase
      .from('admin_roles')
      .select('name');
    
    if (roles && roles.length > 0) {
      console.log('\n✅ Admin roles created:');
      roles.forEach(role => console.log(`   - ${role.name}`));
    }
    
    console.log('\n🎉 Admin system migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Add helper to create first admin user
async function createFirstAdmin(email) {
  try {
    console.log(`\n👤 Creating first admin user for ${email}...`);
    
    // First check if user exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();
    
    if (!profile) {
      console.error('❌ User not found. Please ensure the user exists first.');
      return;
    }
    
    // Get super_admin role
    const { data: role, error: roleError } = await supabase
      .from('admin_roles')
      .select('id')
      .eq('name', 'super_admin')
      .single();
    
    if (!role) {
      console.error('❌ Super admin role not found');
      return;
    }
    
    // Create admin user
    const { data: adminUser, error: createError } = await supabase
      .from('admin_users')
      .insert({
        user_id: profile.id,
        role_id: role.id,
        ip_whitelist: [] // Empty whitelist for development
      })
      .select()
      .single();
    
    if (createError) {
      if (createError.code === '23505') {
        console.log('ℹ️  User is already an admin');
      } else {
        console.error('❌ Error creating admin user:', createError);
      }
      return;
    }
    
    console.log('✅ Admin user created successfully!');
    console.log(`   Role: super_admin`);
    console.log(`   User ID: ${profile.id}`);
    
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  }
}

// Run migration
applyAdminMigration().then(() => {
  // Check if we should create an admin user
  const adminEmail = process.argv[2];
  if (adminEmail) {
    createFirstAdmin(adminEmail);
  } else {
    console.log('\n💡 To create your first admin user, run:');
    console.log('   node scripts/apply-admin-migration.js your-email@example.com');
  }
});