-- ============================================================
-- PROPER ROLE-BASED ADMIN SYSTEM
-- ============================================================
-- Creates a flexible admin system with super_admin role
-- Super admin: shannon@s2transfers.com
-- Super admin can create and manage other admins with specific permissions
-- ============================================================

-- 1. Create admin_users table
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Role System
  role VARCHAR(50) NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'affiliate_manager', 'support_admin', 'financial_admin')),

  -- Permissions (JSON object for granular control)
  permissions JSONB DEFAULT '{
    "view_all_users": false,
    "edit_users": false,
    "view_financials": false,
    "manage_affiliates": false,
    "manage_support": false,
    "manage_admins": false,
    "system_settings": false
  }'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,

  -- Notes
  notes TEXT
);

-- 2. Create indexes
CREATE INDEX idx_admin_users_user_id ON public.admin_users(user_id);
CREATE INDEX idx_admin_users_role ON public.admin_users(role);
CREATE INDEX idx_admin_users_active ON public.admin_users(is_active);

-- 3. Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 4. Admin users can view all admins
CREATE POLICY "Admins can view all admin users"
  ON public.admin_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
      AND au.is_active = true
    )
  );

-- 5. Only super admins can manage admins
CREATE POLICY "Super admins can manage admin users"
  ON public.admin_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
      AND au.role = 'super_admin'
      AND au.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
      AND au.role = 'super_admin'
      AND au.is_active = true
    )
  );

-- 6. Create updated_at trigger
CREATE TRIGGER set_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 7. Create helper functions

-- Function to check if user is admin (any level)
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = user_id
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = user_id
    AND role = 'super_admin'
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check specific permission
CREATE OR REPLACE FUNCTION has_permission(user_id UUID, permission_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Super admins have all permissions
  IF is_super_admin(user_id) THEN
    RETURN true;
  END IF;

  -- Check specific permission
  SELECT * INTO admin_record
  FROM public.admin_users
  WHERE admin_users.user_id = user_id
  AND is_active = true;

  IF admin_record IS NULL THEN
    RETURN false;
  END IF;

  -- Check if permission exists and is true
  RETURN COALESCE((admin_record.permissions->permission_key)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's admin role
CREATE OR REPLACE FUNCTION get_admin_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.admin_users
  WHERE admin_users.user_id = user_id
  AND is_active = true;

  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Insert super admin (shannon@s2transfers.com)
DO $$
DECLARE
  super_admin_id UUID;
BEGIN
  -- Get the user ID for shannon@s2transfers.com
  SELECT id INTO super_admin_id
  FROM auth.users
  WHERE email = 'shannon@s2transfers.com'
  LIMIT 1;

  IF super_admin_id IS NOT NULL THEN
    -- Insert or update super admin
    INSERT INTO public.admin_users (user_id, role, permissions, is_active, notes)
    VALUES (
      super_admin_id,
      'super_admin',
      '{
        "view_all_users": true,
        "edit_users": true,
        "view_financials": true,
        "manage_affiliates": true,
        "manage_support": true,
        "manage_admins": true,
        "system_settings": true
      }'::jsonb,
      true,
      'Super Administrator - Full system access'
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      role = 'super_admin',
      permissions = '{
        "view_all_users": true,
        "edit_users": true,
        "view_financials": true,
        "manage_affiliates": true,
        "manage_support": true,
        "manage_admins": true,
        "system_settings": true
      }'::jsonb,
      is_active = true,
      updated_at = NOW();

    RAISE NOTICE '✅ Super admin created: shannon@s2transfers.com';
  ELSE
    RAISE NOTICE '⚠️  User shannon@s2transfers.com not found';
  END IF;
END $$;

-- 9. Create role presets for easy admin creation
CREATE TABLE IF NOT EXISTS public.admin_role_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  default_permissions JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default role presets
INSERT INTO public.admin_role_presets (role_name, display_name, description, default_permissions) VALUES
('super_admin', 'Super Administrator', 'Full system access - can manage everything including other admins', '{
  "view_all_users": true,
  "edit_users": true,
  "view_financials": true,
  "manage_affiliates": true,
  "manage_support": true,
  "manage_admins": true,
  "system_settings": true
}'::jsonb),

('admin', 'Administrator', 'General admin access - can manage most areas except system settings', '{
  "view_all_users": true,
  "edit_users": true,
  "view_financials": true,
  "manage_affiliates": true,
  "manage_support": true,
  "manage_admins": false,
  "system_settings": false
}'::jsonb),

('affiliate_manager', 'Affiliate Manager', 'Can manage affiliate program only', '{
  "view_all_users": false,
  "edit_users": false,
  "view_financials": false,
  "manage_affiliates": true,
  "manage_support": false,
  "manage_admins": false,
  "system_settings": false
}'::jsonb),

('support_admin', 'Support Administrator', 'Can manage support tickets and user inquiries', '{
  "view_all_users": true,
  "edit_users": false,
  "view_financials": false,
  "manage_affiliates": false,
  "manage_support": true,
  "manage_admins": false,
  "system_settings": false
}'::jsonb),

('financial_admin', 'Financial Administrator', 'Can view and manage financial data', '{
  "view_all_users": true,
  "edit_users": false,
  "view_financials": true,
  "manage_affiliates": false,
  "manage_support": false,
  "manage_admins": false,
  "system_settings": false
}'::jsonb);

-- 10. Create audit log for admin actions
CREATE TABLE IF NOT EXISTS public.admin_action_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID REFERENCES public.admin_users(user_id) ON DELETE SET NULL,
  action_type VARCHAR(100) NOT NULL,
  target_type VARCHAR(100),
  target_id UUID,
  action_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_action_log_admin ON public.admin_action_log(admin_user_id);
CREATE INDEX idx_admin_action_log_created ON public.admin_action_log(created_at);

-- Enable RLS on action log
ALTER TABLE public.admin_action_log ENABLE ROW LEVEL SECURITY;

-- Admins can view their own actions, super admins can view all
CREATE POLICY "Admins can view own actions, super admins all"
  ON public.admin_action_log FOR SELECT
  USING (
    admin_user_id = auth.uid()
    OR is_super_admin(auth.uid())
  );

-- 11. Success message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Admin Role System Created!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Super Admin: shannon@s2transfers.com';
  RAISE NOTICE '';
  RAISE NOTICE 'Available Roles:';
  RAISE NOTICE '  - super_admin: Full system access';
  RAISE NOTICE '  - admin: General admin access';
  RAISE NOTICE '  - affiliate_manager: Affiliate program only';
  RAISE NOTICE '  - support_admin: Support tickets only';
  RAISE NOTICE '  - financial_admin: Financial data only';
  RAISE NOTICE '';
  RAISE NOTICE 'Key Features:';
  RAISE NOTICE '  ✅ Role-based permissions';
  RAISE NOTICE '  ✅ Super admin can create/manage other admins';
  RAISE NOTICE '  ✅ Granular permission control';
  RAISE NOTICE '  ✅ Admin action audit logging';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Log in as shannon@s2transfers.com';
  RAISE NOTICE '  2. Go to /admin/users/admins';
  RAISE NOTICE '  3. Create additional admins as needed';
  RAISE NOTICE '========================================';
END $$;
