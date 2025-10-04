-- Fix test@test.com referral tracking
-- Run this in Supabase SQL Editor

-- Step 1: Find test@test.com user ID
DO $$
DECLARE
  v_user_id UUID;
  v_affiliate_id UUID;
  v_referral_code TEXT;
  v_existing_referral_id UUID;
BEGIN
  -- Get user ID for test@test.com
  SELECT id INTO v_user_id
  FROM profiles
  WHERE email = 'test@test.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User test@test.com not found';
    RETURN;
  END IF;

  RAISE NOTICE 'Found user: %', v_user_id;

  -- Get affiliate ID for SNSMAR
  SELECT id, referral_code INTO v_affiliate_id, v_referral_code
  FROM affiliates
  WHERE referral_code = 'SNSMAR'
  LIMIT 1;

  IF v_affiliate_id IS NULL THEN
    RAISE NOTICE 'Affiliate SNSMAR not found';
    RETURN;
  END IF;

  RAISE NOTICE 'Found affiliate: %', v_affiliate_id;

  -- Check if referral already exists
  SELECT id INTO v_existing_referral_id
  FROM referrals
  WHERE referred_user_id = v_user_id
    AND affiliate_id = v_affiliate_id;

  IF v_existing_referral_id IS NOT NULL THEN
    RAISE NOTICE 'Referral already exists: %', v_existing_referral_id;
    RETURN;
  END IF;

  -- Create referral
  INSERT INTO referrals (
    affiliate_id,
    referred_user_id,
    referral_code,
    status,
    signed_up_at,
    created_at
  )
  VALUES (
    v_affiliate_id,
    v_user_id,
    v_referral_code,
    'signed_up',
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Created referral for test@test.com';

  -- Update affiliate signup count
  UPDATE affiliates
  SET
    total_signups = COALESCE(total_signups, 0) + 1,
    updated_at = NOW()
  WHERE id = v_affiliate_id;

  RAISE NOTICE 'Updated affiliate signup count';
  RAISE NOTICE 'Done!';

END $$;

-- Show the updated affiliate stats
SELECT
  referral_code,
  total_clicks,
  total_signups,
  total_conversions
FROM affiliates
WHERE referral_code = 'SNSMAR';
