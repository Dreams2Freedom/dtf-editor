-- =====================================================
-- FIX AFFILIATE ADMIN ACCESS
-- Run this in Supabase SQL Editor on PRODUCTION
-- =====================================================

-- This fixes the RLS policies to allow admins to view affiliate data
-- The issue: RLS policies only allow users to see their OWN data
-- The fix: Add policies that allow admins (profiles.is_admin = true) to see ALL data

-- Drop existing admin policies (if they exist)
DROP POLICY IF EXISTS "Admins can view all affiliate data" ON public.affiliates;
DROP POLICY IF EXISTS "Admins can update all affiliate data" ON public.affiliates;
DROP POLICY IF EXISTS "Admins can view all referrals" ON public.referrals;
DROP POLICY IF EXISTS "Admins can view all commissions" ON public.commissions;
DROP POLICY IF EXISTS "Admins can view all payouts" ON public.payouts;
DROP POLICY IF EXISTS "Admins can view all visits" ON public.referral_visits;
DROP POLICY IF EXISTS "Admins can view all events" ON public.affiliate_events;

-- =====================================================
-- AFFILIATES TABLE - Admin Policies
-- =====================================================

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

-- =====================================================
-- REFERRALS TABLE - Admin Policies
-- =====================================================

CREATE POLICY "Admins can view all referrals"
  ON public.referrals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update all referrals"
  ON public.referrals FOR UPDATE
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

-- =====================================================
-- REFERRAL VISITS TABLE - Admin Policies
-- =====================================================

CREATE POLICY "Admins can view all visits"
  ON public.referral_visits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- =====================================================
-- COMMISSIONS TABLE - Admin Policies
-- =====================================================

CREATE POLICY "Admins can view all commissions"
  ON public.commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update all commissions"
  ON public.commissions FOR UPDATE
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

-- =====================================================
-- PAYOUTS TABLE - Admin Policies
-- =====================================================

CREATE POLICY "Admins can view all payouts"
  ON public.payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update all payouts"
  ON public.payouts FOR UPDATE
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

-- =====================================================
-- AFFILIATE EVENTS TABLE - Admin Policies
-- =====================================================

CREATE POLICY "Admins can view all events"
  ON public.affiliate_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Run these after to verify the fix worked:

-- 1. Check that policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('affiliates', 'referrals', 'commissions', 'payouts', 'referral_visits', 'affiliate_events')
ORDER BY tablename, policyname;

-- 2. Verify your admin status
SELECT id, email, is_admin
FROM profiles
WHERE email IN ('Shannon@S2Transfers.com', 'shannonherod@gmail.com');

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Admin RLS policies created successfully!';
  RAISE NOTICE '✅ Admins with profiles.is_admin = true can now view all affiliate data';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Make sure you are:';
  RAISE NOTICE '   1. Logged in as Shannon@S2Transfers.com (NOT shannonherod@gmail.com)';
  RAISE NOTICE '   2. Using production environment (NOT localhost)';
  RAISE NOTICE '   3. Have profiles.is_admin = true for your account';
END $$;
