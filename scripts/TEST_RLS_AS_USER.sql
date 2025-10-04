-- Test RLS policy as specific user
-- This simulates what happens when the browser makes a request

-- Set the auth.uid() to Shannon's user ID
SET request.jwt.claims.sub = '1596097b-8333-452a-a2bd-ea27340677ec';

-- Now try to select from affiliates
-- This should work if RLS policy is correct
SELECT * FROM affiliates;

-- Check if the RLS policy condition is true
SELECT
  auth.uid() as current_user,
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  ) as rls_passes;
