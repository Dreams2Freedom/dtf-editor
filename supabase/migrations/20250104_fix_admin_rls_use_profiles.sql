-- Fix Admin RLS Policies to Use Profiles Table Instead of Function
-- This is a workaround since the is_admin() function isn't working
-- We'll use the profiles.is_admin column directly

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can view all affiliate data" ON public.affiliates;
DROP POLICY IF EXISTS "Admins can update all affiliate data" ON public.affiliates;
DROP POLICY IF EXISTS "Admins can view all referrals" ON public.referrals;
DROP POLICY IF EXISTS "Admins can view all commissions" ON public.commissions;
DROP POLICY IF EXISTS "Admins can view all payouts" ON public.payouts;

-- Create new policies using profiles.is_admin
CREATE POLICY "Admins can view all affiliate data"
  ON public.affiliates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update all affiliate data"
  ON public.affiliates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can view all referrals"
  ON public.referrals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can view all commissions"
  ON public.commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can view all payouts"
  ON public.payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Admin RLS policies updated to use profiles.is_admin';
  RAISE NOTICE '   Admin users can now view all affiliate data';
END $$;
