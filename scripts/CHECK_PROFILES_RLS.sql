-- Check if profiles table has RLS that might block the admin check

-- 1. Check if RLS is enabled on profiles
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'profiles';

-- 2. List all policies on profiles table
SELECT
  policyname,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'profiles';

-- 3. Check if Shannon's profile exists and has is_admin = true
SELECT
  id,
  email,
  is_admin
FROM profiles
WHERE id = '1596097b-8333-452a-a2bd-ea27340677ec';
