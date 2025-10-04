-- ============================================================
-- FIX AFFILIATE ADMIN ACCESS
-- ============================================================
-- Run this SQL in the Supabase Dashboard SQL Editor
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
-- ============================================================

-- Step 1: Drop existing is_admin function (it exists with wrong parameter name)
DROP FUNCTION IF EXISTS is_admin(uuid);

-- Step 1b: Create the is_admin function (checks admin_users table)
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

-- Step 2: Drop existing admin policies
DROP POLICY IF EXISTS "Admins can view all affiliate data" ON public.affiliates;
DROP POLICY IF EXISTS "Admins can update all affiliate data" ON public.affiliates;
DROP POLICY IF EXISTS "Admins can view all referrals" ON public.referrals;
DROP POLICY IF EXISTS "Admins can view all commissions" ON public.commissions;
DROP POLICY IF EXISTS "Admins can view all payouts" ON public.payouts;

-- Step 3: Create admin policies using the is_admin function
CREATE POLICY "Admins can view all affiliate data"
  ON public.affiliates FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update all affiliate data"
  ON public.affiliates FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can view all referrals"
  ON public.referrals FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view all commissions"
  ON public.commissions FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view all payouts"
  ON public.payouts FOR SELECT
  USING (is_admin(auth.uid()));

-- Step 4: Test the function
SELECT
  'shannonherod@gmail.com' as email,
  'fcc1b251-6307-457c-ac1e-064aa43b2449'::uuid as user_id,
  is_admin('fcc1b251-6307-457c-ac1e-064aa43b2449'::uuid) as is_admin;

-- Success!
SELECT '✅ Admin access configured successfully!' as result;
