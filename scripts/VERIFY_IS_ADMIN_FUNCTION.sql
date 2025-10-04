-- Verify is_admin() function exists and works

-- 1. Check if function exists
SELECT
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'is_admin';

-- 2. Test the function with Shannon's user ID
SELECT is_admin('1596097b-8333-452a-a2bd-ea27340677ec'::uuid) as result;

-- 3. Check what it returns when called within an RLS context
-- (This simulates what happens when used in a policy)
SELECT
  'Testing is_admin in RLS context' as test_name,
  is_admin('1596097b-8333-452a-a2bd-ea27340677ec'::uuid) as should_be_true;
