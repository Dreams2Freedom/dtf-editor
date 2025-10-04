-- =====================================================
-- VERIFY ADMIN ACCESS AND DEBUG RLS
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Check if the RLS policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as command,
  permissive,
  roles
FROM pg_policies
WHERE tablename IN ('affiliates', 'referrals', 'commissions', 'payouts')
  AND policyname LIKE '%Admin%'
ORDER BY tablename, policyname;

-- 2. Check the profiles table for Shannon's admin status
SELECT
  id,
  email,
  is_admin,
  created_at
FROM profiles
WHERE email = 'Shannon@S2Transfers.com';

-- 3. Check if there are any affiliates in the database
SELECT COUNT(*) as total_affiliates FROM affiliates;

-- 4. Try to select affiliates as if you were the admin
-- This simulates what should happen when Shannon@S2Transfers.com queries the table
DO $$
DECLARE
  admin_user_id UUID;
  can_see_affiliates BOOLEAN;
BEGIN
  -- Get Shannon's user ID
  SELECT id INTO admin_user_id
  FROM profiles
  WHERE email = 'Shannon@S2Transfers.com';

  RAISE NOTICE 'Admin User ID: %', admin_user_id;

  -- Check if this user has is_admin = true
  SELECT is_admin INTO can_see_affiliates
  FROM profiles
  WHERE id = admin_user_id;

  RAISE NOTICE 'Is Admin: %', can_see_affiliates;

  -- Check if the RLS policy would work
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = admin_user_id
    AND is_admin = true
  ) THEN
    RAISE NOTICE '✅ RLS check WOULD PASS for this user';
  ELSE
    RAISE NOTICE '❌ RLS check WOULD FAIL for this user';
  END IF;
END $$;

-- 5. Check auth.users to see if Shannon exists there too
SELECT
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'Shannon@S2Transfers.com';

-- 6. Test the actual policy logic manually
-- This checks if the exact query in the RLS policy would return true
SELECT
  'Can view affiliates:' as check_type,
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.email = 'Shannon@S2Transfers.com'
    AND profiles.is_admin = true
  ) as result;
