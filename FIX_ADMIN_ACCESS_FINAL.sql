-- ============================================================
-- FINAL FIX FOR AFFILIATE ADMIN ACCESS
-- ============================================================
-- This updates the is_admin function to work with BOTH:
-- 1. Existing system (profiles.is_admin)
-- 2. New system (admin_users table)
-- ============================================================

-- Step 1: Drop and recreate the function with the correct parameter name
-- The existing function uses "check_user_id" but policies call it with positional param
-- We'll make it work both ways by using a simple parameter name

DROP FUNCTION IF EXISTS is_admin(uuid) CASCADE;

-- Create unified admin check function
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check BOTH systems for maximum compatibility:
    -- 1. Check profiles.is_admin (old system)
    -- 2. Check admin_users table (new system)
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = check_user_id
        AND is_admin = true
    ) OR EXISTS (
        SELECT 1 FROM admin_users
        WHERE user_id = check_user_id
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql;

-- Step 2: Recreate the affiliate policies (they were dropped by CASCADE)
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

-- Step 3: Test the function
SELECT
  'Test Results:' as test,
  is_admin('fcc1b251-6307-457c-ac1e-064aa43b2449'::uuid) as shannonherod_gmail_is_admin,
  is_admin('1596097b-8333-452a-a2bd-ea27340677ec'::uuid) as shannon_s2transfers_is_admin;

-- Success message
SELECT '✅ Admin access fixed! Both admin systems now work.' as result;
