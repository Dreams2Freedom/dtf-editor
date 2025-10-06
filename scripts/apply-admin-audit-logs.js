const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('Creating admin_audit_logs table...');

    const migration = `
      -- Create admin audit logs table for tracking admin actions
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        details JSONB DEFAULT '{}',
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Add indexes for performance
      CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
      CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_resource ON admin_audit_logs(resource_type, resource_id);
      CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at);

      -- Enable RLS
      ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

      -- Drop existing policy if it exists
      DROP POLICY IF EXISTS "Super admins can view all audit logs" ON admin_audit_logs;

      -- Only super admins can view audit logs
      CREATE POLICY "Super admins can view all audit logs" ON admin_audit_logs
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
          )
        );
    `;

    const { error } = await supabase.rpc('exec_sql', { sql: migration });

    if (error) {
      // Try executing directly if exec_sql doesn't exist
      console.log(
        'exec_sql not available, applying migration parts separately...'
      );

      // Check if table exists
      const { data: tableExists } = await supabase
        .from('admin_audit_logs')
        .select('id')
        .limit(1);

      if (!tableExists) {
        console.log('Table needs to be created manually in Supabase dashboard');
        console.log('Migration SQL:');
        console.log(migration);
      } else {
        console.log('Table already exists!');
      }
    } else {
      console.log('✅ Admin audit logs table created successfully');
    }
  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();
