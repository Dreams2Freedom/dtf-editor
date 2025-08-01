-- Migration: Create Admin System Tables
-- Description: Sets up the complete admin system with roles, users, audit logs, and support tickets

-- Enable UUID extension if not already enabled
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

-- Create admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES admin_roles(id) ON DELETE RESTRICT,
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret TEXT, -- Encrypted TOTP secret
  ip_whitelist TEXT[] DEFAULT '{}',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES admin_users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create admin audit logs table
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

-- Create indexes for better performance
CREATE INDEX idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX idx_admin_audit_logs_resource ON admin_audit_logs(resource_type, resource_id);

-- Create support tickets table
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

-- Create support ticket messages table
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin', 'system')),
  sender_id UUID, -- Can be user_id or admin_user_id
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  is_internal BOOLEAN DEFAULT false, -- Internal notes not visible to users
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for support tables
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_assigned ON support_tickets(assigned_admin_id);
CREATE INDEX idx_support_ticket_messages_ticket ON support_ticket_messages(ticket_id);

-- Insert default admin roles
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
  }'::jsonb, 'Read-only access to analytics and reports');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_admin_roles_updated_at BEFORE UPDATE ON admin_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO admin_audit_logs (
    admin_id, action, resource_type, resource_id, 
    details, ip_address, user_agent
  ) VALUES (
    p_admin_id, p_action, p_resource_type, p_resource_id,
    p_details, p_ip_address, p_user_agent
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies for admin tables
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Admin roles policies (only super_admin can manage)
CREATE POLICY "Admin roles viewable by all admins" ON admin_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin roles manageable by super_admin" ON admin_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN admin_roles ar ON au.role_id = ar.id
      WHERE au.user_id = auth.uid()
      AND ar.permissions->>'admin'->>'manage' = 'true'
    )
  );

-- Admin users policies
CREATE POLICY "Admin users viewable by admins with permission" ON admin_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN admin_roles ar ON au.role_id = ar.id
      WHERE au.user_id = auth.uid()
      AND (
        ar.permissions->>'admin'->>'manage' = 'true'
        OR au.user_id = auth.uid() -- Can view own record
      )
    )
  );

CREATE POLICY "Admin users manageable by super_admin" ON admin_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN admin_roles ar ON au.role_id = ar.id
      WHERE au.user_id = auth.uid()
      AND ar.permissions->>'admin'->>'manage' = 'true'
    )
  );

-- Audit logs policies (view only, insert through function)
CREATE POLICY "Audit logs viewable by admins" ON admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN admin_roles ar ON au.role_id = ar.id
      WHERE au.user_id = auth.uid()
      AND ar.permissions->>'admin'->>'manage' = 'true'
    )
  );

-- Support tickets policies
CREATE POLICY "Support tickets viewable by involved parties" ON support_tickets
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() -- User can see their own tickets
    OR EXISTS (
      SELECT 1 FROM admin_users au
      JOIN admin_roles ar ON au.role_id = ar.id
      WHERE au.user_id = auth.uid()
      AND ar.permissions->>'support'->>'view' = 'true'
    )
  );

CREATE POLICY "Support tickets editable by support admins" ON support_tickets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      JOIN admin_roles ar ON au.role_id = ar.id
      WHERE au.user_id = auth.uid()
      AND ar.permissions->>'support'->>'respond' = 'true'
    )
  );

-- Support messages policies
CREATE POLICY "Support messages viewable by involved parties" ON support_ticket_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = ticket_id
      AND (
        st.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM admin_users au
          JOIN admin_roles ar ON au.role_id = ar.id
          WHERE au.user_id = auth.uid()
          AND ar.permissions->>'support'->>'view' = 'true'
        )
      )
    )
    AND (
      NOT is_internal -- Users can't see internal notes
      OR EXISTS (
        SELECT 1 FROM admin_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- Create view for admin user details with role info
CREATE OR REPLACE VIEW admin_users_with_roles AS
SELECT 
  au.*,
  ar.name as role_name,
  ar.permissions as role_permissions,
  u.email as user_email,
  p.full_name as user_full_name
FROM admin_users au
JOIN admin_roles ar ON au.role_id = ar.id
JOIN auth.users u ON au.user_id = u.id
LEFT JOIN profiles p ON au.user_id = p.id;

-- Grant permissions to authenticated users
GRANT SELECT ON admin_users_with_roles TO authenticated;

-- Create function to check admin permissions
CREATE OR REPLACE FUNCTION check_admin_permission(
  p_permission_path TEXT[]
)
RETURNS BOOLEAN AS $$
DECLARE
  v_permissions JSONB;
  v_current JSONB;
  v_path_element TEXT;
BEGIN
  -- Get admin user's permissions
  SELECT ar.permissions INTO v_permissions
  FROM admin_users au
  JOIN admin_roles ar ON au.role_id = ar.id
  WHERE au.user_id = auth.uid();

  IF v_permissions IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Navigate through the permission path
  v_current := v_permissions;
  FOREACH v_path_element IN ARRAY p_permission_path
  LOOP
    v_current := v_current->v_path_element;
    IF v_current IS NULL THEN
      RETURN FALSE;
    END IF;
  END LOOP;

  -- Check if the final value is true
  RETURN v_current::text = 'true';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get current admin user
CREATE OR REPLACE FUNCTION get_current_admin_user()
RETURNS admin_users AS $$
DECLARE
  v_admin admin_users;
BEGIN
  SELECT * INTO v_admin
  FROM admin_users
  WHERE user_id = auth.uid();
  
  RETURN v_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;