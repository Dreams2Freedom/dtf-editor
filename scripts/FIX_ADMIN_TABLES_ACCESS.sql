-- ============================================================
-- FIX ADMIN TABLES ACCESS
-- ============================================================
-- This fixes RLS policies blocking service_role access
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Grant service role full access to admin tables
GRANT ALL ON public.admin_users TO service_role;
GRANT ALL ON public.admin_role_presets TO service_role;
GRANT ALL ON public.admin_action_log TO service_role;

-- 2. Add service role bypass policies
CREATE POLICY "Service role bypass for admin_users"
  ON public.admin_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role bypass for admin_role_presets"
  ON public.admin_role_presets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role bypass for admin_action_log"
  ON public.admin_action_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Check if shannon@s2transfers.com is already in admin_users
DO $$
DECLARE
  shannon_user_id UUID;
  admin_exists BOOLEAN;
BEGIN
  -- Get shannon's user ID
  SELECT id INTO shannon_user_id
  FROM auth.users
  WHERE email = 'shannon@s2transfers.com'
  LIMIT 1;

  IF shannon_user_id IS NULL THEN
    RAISE NOTICE '❌ User shannon@s2transfers.com not found';
    RETURN;
  END IF;

  -- Check if admin record exists
  SELECT EXISTS(
    SELECT 1 FROM public.admin_users WHERE user_id = shannon_user_id
  ) INTO admin_exists;

  IF admin_exists THEN
    RAISE NOTICE '✅ Admin record already exists for shannon@s2transfers.com';

    -- Update to ensure super_admin role
    UPDATE public.admin_users
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
      updated_at = NOW()
    WHERE user_id = shannon_user_id;

    RAISE NOTICE '✅ Updated to super_admin with full permissions';
  ELSE
    RAISE NOTICE '📝 Creating super admin record...';

    -- Insert super admin record
    INSERT INTO public.admin_users (user_id, role, permissions, is_active, notes)
    VALUES (
      shannon_user_id,
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
    );

    RAISE NOTICE '✅ Super admin created successfully!';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Admin access fixed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Log out of dtfeditor.com';
  RAISE NOTICE '  2. Log back in as shannon@s2transfers.com';
  RAISE NOTICE '  3. Visit /admin/users/admins';
  RAISE NOTICE '  4. Visit /admin/affiliates/applications';
  RAISE NOTICE '';
END $$;
