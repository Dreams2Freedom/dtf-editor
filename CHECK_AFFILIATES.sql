-- Run this in Supabase SQL Editor to check affiliate data

-- 1. Check total affiliates count
SELECT COUNT(*) as total_affiliates FROM public.affiliates;

-- 2. Check all affiliates (limited to 10)
SELECT
  id,
  user_id,
  referral_code,
  status,
  created_at
FROM public.affiliates
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if Shannon@S2Transfers.com has is_admin = true
SELECT
  id,
  email,
  is_admin,
  full_name
FROM public.profiles
WHERE email = 'Shannon@S2Transfers.com';

-- 4. Check RLS policies on affiliates table
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as command,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE tablename = 'affiliates'
ORDER BY policyname;

-- 5. Test if the admin policy would work for Shannon
DO $$
DECLARE
  shannon_id UUID;
  can_access BOOLEAN;
BEGIN
  -- Get Shannon's ID
  SELECT id INTO shannon_id
  FROM public.profiles
  WHERE email = 'Shannon@S2Transfers.com';

  -- Check if admin check would pass
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = shannon_id
    AND is_admin = true
  ) INTO can_access;

  RAISE NOTICE 'Shannon User ID: %', shannon_id;
  RAISE NOTICE 'Has Admin Access: %', can_access;

  IF can_access THEN
    RAISE NOTICE '✅ Shannon CAN access affiliate data via RLS policies';
  ELSE
    RAISE NOTICE '❌ Shannon CANNOT access affiliate data - is_admin may be false';
  END IF;
END $$;
