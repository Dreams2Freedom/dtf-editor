-- ============================================================
-- FIX ADMIN ACCESS TO AFFILIATE TABLES
-- ============================================================
-- Run this SQL in Supabase Dashboard > SQL Editor
-- This will allow shannon@s2transfers.com to access affiliate data
-- ============================================================

-- 1. Update the is_admin function to include the correct admin emails
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = user_id
    AND (
      email IN (
        'shannon@s2transfers.com',
        'shannonherod@gmail.com',
        'admin@dtfeditor.com'
      )
      OR raw_user_meta_data->>'role' = 'admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop existing policies (if they exist)
DROP POLICY IF EXISTS "Users can view their own affiliate data" ON public.affiliates;
DROP POLICY IF EXISTS "Admins can view all affiliate data" ON public.affiliates;
DROP POLICY IF EXISTS "Users can update their own affiliate data" ON public.affiliates;
DROP POLICY IF EXISTS "Admins can update all affiliate data" ON public.affiliates;
DROP POLICY IF EXISTS "Anyone can insert affiliate application" ON public.affiliates;

DROP POLICY IF EXISTS "Affiliates can view their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Admins can view all referrals" ON public.referrals;

DROP POLICY IF EXISTS "Affiliates can view their own commissions" ON public.commissions;
DROP POLICY IF EXISTS "Admins can view all commissions" ON public.commissions;

DROP POLICY IF EXISTS "Affiliates can view their own payouts" ON public.payouts;
DROP POLICY IF EXISTS "Admins can view all payouts" ON public.payouts;

-- 3. Create new policies for AFFILIATES table
CREATE POLICY "Users can view their own affiliate data"
  ON public.affiliates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all affiliate data"
  ON public.affiliates FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can update their own affiliate data"
  ON public.affiliates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all affiliate data"
  ON public.affiliates FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Anyone can insert affiliate application"
  ON public.affiliates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. Create policies for REFERRALS table
CREATE POLICY "Affiliates can view their own referrals"
  ON public.referrals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliates
      WHERE affiliates.id = referrals.affiliate_id
      AND affiliates.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all referrals"
  ON public.referrals FOR SELECT
  USING (is_admin(auth.uid()));

-- 5. Create policies for COMMISSIONS table
CREATE POLICY "Affiliates can view their own commissions"
  ON public.commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliates
      WHERE affiliates.id = commissions.affiliate_id
      AND affiliates.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all commissions"
  ON public.commissions FOR SELECT
  USING (is_admin(auth.uid()));

-- 6. Create policies for PAYOUTS table
CREATE POLICY "Affiliates can view their own payouts"
  ON public.payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliates
      WHERE affiliates.id = payouts.affiliate_id
      AND affiliates.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all payouts"
  ON public.payouts FOR SELECT
  USING (is_admin(auth.uid()));

-- 7. Test the setup
DO $$
DECLARE
  admin_user_id UUID;
  admin_email TEXT;
  is_user_admin BOOLEAN;
BEGIN
  -- Find the admin user
  SELECT id, email INTO admin_user_id, admin_email
  FROM auth.users
  WHERE email = 'shannon@s2transfers.com'
  LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    -- Check if user is admin
    is_user_admin := is_admin(admin_user_id);

    RAISE NOTICE '================================';
    RAISE NOTICE 'Admin Setup Complete!';
    RAISE NOTICE '================================';
    RAISE NOTICE 'Admin user: %', admin_email;
    RAISE NOTICE 'User ID: %', admin_user_id;
    RAISE NOTICE 'Is admin: %', is_user_admin;
    RAISE NOTICE '';
    RAISE NOTICE 'Configured admin emails:';
    RAISE NOTICE '  - shannon@s2transfers.com';
    RAISE NOTICE '  - shannonherod@gmail.com';
    RAISE NOTICE '  - admin@dtfeditor.com';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now access affiliate data at:';
    RAISE NOTICE '  /admin/affiliates/applications';
    RAISE NOTICE '================================';
  ELSE
    RAISE NOTICE 'User shannon@s2transfers.com not found';
  END IF;
END $$;
