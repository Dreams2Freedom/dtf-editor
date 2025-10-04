-- ============================================================
-- FIX ADMIN FUNCTIONS V2 - Drop and Recreate
-- ============================================================
-- This fixes the "column reference user_id is ambiguous" error
-- by dropping and recreating functions with correct parameter names
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Drop existing functions
DROP FUNCTION IF EXISTS is_admin(UUID);
DROP FUNCTION IF EXISTS is_super_admin(UUID);
DROP FUNCTION IF EXISTS has_permission(UUID, TEXT);
DROP FUNCTION IF EXISTS get_admin_role(UUID);

-- 2. Recreate is_admin function with fixed parameter name
CREATE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = check_user_id
    AND admin_users.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate is_super_admin function with fixed parameter name
CREATE FUNCTION is_super_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = check_user_id
    AND admin_users.role = 'super_admin'
    AND admin_users.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recreate has_permission function with fixed parameter name
CREATE FUNCTION has_permission(check_user_id UUID, permission_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Super admins have all permissions
  IF is_super_admin(check_user_id) THEN
    RETURN true;
  END IF;

  -- Check specific permission
  SELECT * INTO admin_record
  FROM public.admin_users
  WHERE admin_users.user_id = check_user_id
  AND admin_users.is_active = true;

  IF admin_record IS NULL THEN
    RETURN false;
  END IF;

  -- Check if permission exists and is true
  RETURN COALESCE((admin_record.permissions->permission_key)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Recreate get_admin_role function with fixed parameter name
CREATE FUNCTION get_admin_role(check_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.admin_users
  WHERE admin_users.user_id = check_user_id
  AND admin_users.is_active = true;

  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Test the functions
DO $$
DECLARE
  shannon_id UUID;
  test_admin BOOLEAN;
  test_super BOOLEAN;
  test_role TEXT;
BEGIN
  -- Get shannon's ID
  SELECT id INTO shannon_id
  FROM auth.users
  WHERE email = 'shannon@s2transfers.com'
  LIMIT 1;

  IF shannon_id IS NULL THEN
    RAISE NOTICE '❌ User not found';
    RETURN;
  END IF;

  -- Test functions
  test_admin := is_admin(shannon_id);
  test_super := is_super_admin(shannon_id);
  test_role := get_admin_role(shannon_id);

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Admin Functions Fixed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Test Results for shannon@s2transfers.com:';
  RAISE NOTICE '  is_admin(): %', test_admin;
  RAISE NOTICE '  is_super_admin(): %', test_super;
  RAISE NOTICE '  get_admin_role(): %', test_role;
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Hard refresh the page (Cmd+Shift+R)';
  RAISE NOTICE '  2. Visit /admin/users/admins';
  RAISE NOTICE '  3. Visit /admin/affiliates/applications';
  RAISE NOTICE '========================================';
END $$;
