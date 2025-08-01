const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Split the migration into smaller chunks that Supabase can handle
const migrations = [
  // 1. Create tables
  `
  -- Enable UUID extension
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

  -- Create admin roles table
  CREATE TABLE IF NOT EXISTS admin_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    permissions JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  `,
  
  // 2. Create admin users table
  `
  CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES admin_roles(id) ON DELETE RESTRICT,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret TEXT,
    ip_whitelist TEXT[] DEFAULT '{}',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES admin_users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
  );
  `,
  
  // 3. Create audit logs table
  `
  CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  `,
  
  // 4. Create support tables
  `
  CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    assigned_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    subject TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    first_response_at TIMESTAMPTZ,
    sla_deadline TIMESTAMPTZ
  );
  
  CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin', 'system')),
    sender_id UUID,
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  `,
  
  // 5. Create indexes
  `
  CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
  CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_resource ON admin_audit_logs(resource_type, resource_id);
  CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
  CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
  CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_admin_id);
  CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket ON support_ticket_messages(ticket_id);
  `,
  
  // 6. Insert default roles
  `
  INSERT INTO admin_roles (name, permissions, description) VALUES
    ('super_admin', '{
      "users": {"view": true, "edit": true, "delete": true, "impersonate": true},
      "financial": {"view": true, "refund": true, "addCredits": true},
      "system": {"settings": true, "maintenance": true, "apiKeys": true},
      "analytics": {"view": true, "export": true},
      "support": {"view": true, "respond": true, "assign": true},
      "admin": {"manage": true}
    }'::jsonb, 'Full system access including admin management'),
    
    ('admin', '{
      "users": {"view": true, "edit": true, "delete": false, "impersonate": true},
      "financial": {"view": true, "refund": true, "addCredits": true},
      "system": {"settings": false, "maintenance": false, "apiKeys": false},
      "analytics": {"view": true, "export": true},
      "support": {"view": true, "respond": true, "assign": true},
      "admin": {"manage": false}
    }'::jsonb, 'Standard admin with user and financial management'),
    
    ('support', '{
      "users": {"view": true, "edit": false, "delete": false, "impersonate": false},
      "financial": {"view": false, "refund": false, "addCredits": true},
      "system": {"settings": false, "maintenance": false, "apiKeys": false},
      "analytics": {"view": false, "export": false},
      "support": {"view": true, "respond": true, "assign": false},
      "admin": {"manage": false}
    }'::jsonb, 'Support staff with limited user access'),
    
    ('analytics', '{
      "users": {"view": true, "edit": false, "delete": false, "impersonate": false},
      "financial": {"view": true, "refund": false, "addCredits": false},
      "system": {"settings": false, "maintenance": false, "apiKeys": false},
      "analytics": {"view": true, "export": true},
      "support": {"view": false, "respond": false, "assign": false},
      "admin": {"manage": false}
    }'::jsonb, 'Read-only access to analytics and reports')
  ON CONFLICT (name) DO NOTHING;
  `
];

async function runMigrations() {
  console.log('🚀 Starting admin system migration...\n');
  
  for (let i = 0; i < migrations.length; i++) {
    console.log(`Running migration ${i + 1}/${migrations.length}...`);
    
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrations[i]
    });
    
    if (error) {
      console.error(`❌ Migration ${i + 1} failed:`, error.message);
      // Try alternative approach for local dev
      console.log('Trying alternative approach...');
      
      // For local development, you might need to run these manually
      console.log('Migration SQL:', migrations[i].substring(0, 100) + '...');
    } else {
      console.log(`✅ Migration ${i + 1} completed`);
    }
  }
  
  // Verify tables
  console.log('\n📊 Verifying tables...');
  const tables = ['admin_roles', 'admin_users', 'admin_audit_logs', 'support_tickets'];
  
  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      console.log(`❌ Table ${table}: Not accessible (${error.message})`);
    } else {
      console.log(`✅ Table ${table}: Ready`);
    }
  }
  
  // Check roles
  const { data: roles } = await supabase.from('admin_roles').select('name');
  if (roles && roles.length > 0) {
    console.log('\n✅ Admin roles created:');
    roles.forEach(role => console.log(`   - ${role.name}`));
  }
  
  console.log('\n🎉 Migration completed!');
  
  // Create first admin if email provided
  const adminEmail = process.argv[2];
  if (adminEmail) {
    await createAdminUser(adminEmail);
  } else {
    console.log('\n💡 To create your first admin user, run:');
    console.log('   node scripts/run-admin-migration.js your-email@example.com');
  }
}

async function createAdminUser(email) {
  console.log(`\n👤 Creating admin user for ${email}...`);
  
  // Get user
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();
  
  if (!profile) {
    console.error('❌ User not found. Create a regular account first.');
    return;
  }
  
  // Get super_admin role
  const { data: role } = await supabase
    .from('admin_roles')
    .select('id')
    .eq('name', 'super_admin')
    .single();
  
  // Create admin user
  const { error } = await supabase
    .from('admin_users')
    .insert({
      user_id: profile.id,
      role_id: role.id
    });
  
  if (error) {
    if (error.code === '23505') {
      console.log('ℹ️  User is already an admin');
    } else {
      console.error('❌ Error:', error.message);
    }
  } else {
    console.log('✅ Admin user created successfully!');
  }
}

runMigrations().catch(console.error);