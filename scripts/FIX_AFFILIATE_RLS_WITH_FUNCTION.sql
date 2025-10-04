-- Fix Affiliate RLS by using SECURITY DEFINER function
-- This bypasses the profiles table RLS when checking admin status

-- Drop existing admin policies on affiliate tables
DROP POLICY IF EXISTS "Admins can view all affiliate data" ON public.affiliates;
DROP POLICY IF EXISTS "Admins can update all affiliate data" ON public.affiliates;
DROP POLICY IF EXISTS "Admins can view all referrals" ON public.referrals;
DROP POLICY IF EXISTS "Admins can view all commissions" ON public.commissions;
DROP POLICY IF EXISTS "Admins can view all payouts" ON public.payouts;

-- Create new policies using is_admin() function (which has SECURITY DEFINER)
-- The is_admin() function bypasses RLS on the profiles table

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

-- Success message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Affiliate RLS Fixed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changed from subquery to is_admin() function';
  RAISE NOTICE 'The function has SECURITY DEFINER which bypasses';
  RAISE NOTICE 'the profiles table RLS policies.';
  RAISE NOTICE '';
  RAISE NOTICE 'Admin users can now access all affiliate data!';
  RAISE NOTICE '========================================';
END $$;
