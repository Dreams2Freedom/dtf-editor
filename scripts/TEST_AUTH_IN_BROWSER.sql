-- Simple test: Check if you're authenticated and have admin access
-- Run this query by itself

SELECT
  auth.uid() as my_user_id,
  auth.email() as my_email,
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) as my_is_admin_status,
  (SELECT COUNT(*) FROM affiliates) as total_affiliates_in_db,
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  ) as rls_check_passes;
