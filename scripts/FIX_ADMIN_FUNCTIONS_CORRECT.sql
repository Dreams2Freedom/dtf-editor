-- Fix Admin Functions - Correct Parameter Names
--
-- PROBLEM: Production has functions with parameter "check_user_id"
--          But client code calls them with parameter "user_id"
--
-- SOLUTION: Drop and recreate with correct parameter names

-- Drop existing functions (they have wrong parameter names)
DROP FUNCTION IF EXISTS is_super_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_admin_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS has_permission(uuid, text) CASCADE;

-- Now create with correct parameter names (user_id, not check_user_id)

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = is_super_admin.user_id
    AND au.role = 'super_admin'
    AND au.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's admin role
CREATE OR REPLACE FUNCTION get_admin_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT au.role INTO user_role
  FROM public.admin_users au
  WHERE au.user_id = get_admin_role.user_id
  AND au.is_active = true;

  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check specific permission
CREATE OR REPLACE FUNCTION has_permission(user_id UUID, permission_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Super admins have all permissions
  IF is_super_admin(has_permission.user_id) THEN
    RETURN true;
  END IF;

  -- Check specific permission
  SELECT * INTO admin_record
  FROM public.admin_users au
  WHERE au.user_id = has_permission.user_id
  AND au.is_active = true;

  IF admin_record IS NULL THEN
    RETURN false;
  END IF;

  -- Check if permission exists and is true
  RETURN COALESCE((admin_record.permissions->has_permission.permission_key)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Admin Functions Fixed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions recreated with correct parameter names:';
  RAISE NOTICE '  ✅ is_super_admin(user_id UUID)';
  RAISE NOTICE '  ✅ get_admin_role(user_id UUID)';
  RAISE NOTICE '  ✅ has_permission(user_id UUID, permission_key TEXT)';
  RAISE NOTICE '';
  RAISE NOTICE 'Parameter name changed from "check_user_id" to "user_id"';
  RAISE NOTICE 'to match what the client code expects.';
  RAISE NOTICE '========================================';
END $$;
