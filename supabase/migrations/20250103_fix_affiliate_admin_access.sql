-- Fix admin access to affiliates data
-- Allow authenticated users who are admins to view all affiliate data

-- First, let's create a function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user email is in admin list
  -- You can modify this to check a specific admin table or role
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = user_id
    AND (
      email IN ('shannonherod@gmail.com', 'admin@dtfeditor.com')
      -- Add more admin emails here
      OR raw_user_meta_data->>'role' = 'admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own affiliate data" ON public.affiliates;
DROP POLICY IF EXISTS "Admins can view all affiliate data" ON public.affiliates;

-- Create new policies with admin access
CREATE POLICY "Users can view their own affiliate data"
  ON public.affiliates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all affiliate data"
  ON public.affiliates FOR SELECT
  USING (is_admin(auth.uid()));

-- Allow admins to update affiliate data
CREATE POLICY "Admins can update all affiliate data"
  ON public.affiliates FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Also fix referrals table
DROP POLICY IF EXISTS "Affiliates can view their own referrals" ON public.referrals;
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

-- Fix commissions table
DROP POLICY IF EXISTS "Affiliates can view their own commissions" ON public.commissions;
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

-- Fix payouts table
DROP POLICY IF EXISTS "Affiliates can view their own payouts" ON public.payouts;
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

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Admin access policies created successfully!';
  RAISE NOTICE 'Make sure to add your admin email to the is_admin function';
END $$;