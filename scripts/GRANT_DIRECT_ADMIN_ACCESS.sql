-- Emergency fix: Grant direct access to Shannon's user ID
-- This bypasses the is_admin() function issue temporarily

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can view all affiliate data" ON public.affiliates;
DROP POLICY IF EXISTS "Admins can update all affiliate data" ON public.affiliates;
DROP POLICY IF EXISTS "Admins can view all referrals" ON public.referrals;
DROP POLICY IF EXISTS "Admins can view all commissions" ON public.commissions;
DROP POLICY IF EXISTS "Admins can view all payouts" ON public.payouts;

-- Create policies with DIRECT user ID check (no function, no subquery)
-- Shannon's user ID: 1596097b-8333-452a-a2bd-ea27340677ec

CREATE POLICY "Admins can view all affiliate data"
  ON public.affiliates FOR SELECT
  USING (
    auth.uid() = '1596097b-8333-452a-a2bd-ea27340677ec'::uuid
    OR auth.uid() = user_id
  );

CREATE POLICY "Admins can update all affiliate data"
  ON public.affiliates FOR UPDATE
  USING (
    auth.uid() = '1596097b-8333-452a-a2bd-ea27340677ec'::uuid
    OR auth.uid() = user_id
  )
  WITH CHECK (
    auth.uid() = '1596097b-8333-452a-a2bd-ea27340677ec'::uuid
    OR auth.uid() = user_id
  );

CREATE POLICY "Admins can view all referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = '1596097b-8333-452a-a2bd-ea27340677ec'::uuid);

CREATE POLICY "Admins can view all commissions"
  ON public.commissions FOR SELECT
  USING (auth.uid() = '1596097b-8333-452a-a2bd-ea27340677ec'::uuid);

CREATE POLICY "Admins can view all payouts"
  ON public.payouts FOR SELECT
  USING (auth.uid() = '1596097b-8333-452a-a2bd-ea27340677ec'::uuid);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Direct Admin Access Granted!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Shannon@S2Transfers.com can now access:';
  RAISE NOTICE '  ✅ All affiliate data';
  RAISE NOTICE '  ✅ All referrals';
  RAISE NOTICE '  ✅ All commissions';
  RAISE NOTICE '  ✅ All payouts';
  RAISE NOTICE '';
  RAISE NOTICE 'This uses direct UUID matching instead of functions.';
  RAISE NOTICE '========================================';
END $$;
