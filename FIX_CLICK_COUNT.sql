-- Fix SNSMAR click count from actual visit records
-- This will count all visits in referral_visits and update the affiliate's total_clicks

DO $$
DECLARE
  v_affiliate_id UUID;
  v_visit_count INTEGER;
BEGIN
  -- Get affiliate ID for SNSMAR
  SELECT id INTO v_affiliate_id
  FROM affiliates
  WHERE referral_code = 'SNSMAR'
  LIMIT 1;

  IF v_affiliate_id IS NULL THEN
    RAISE NOTICE 'Affiliate SNSMAR not found';
    RETURN;
  END IF;

  RAISE NOTICE 'Found affiliate: %', v_affiliate_id;

  -- Count actual visits in referral_visits table
  SELECT COUNT(*) INTO v_visit_count
  FROM referral_visits
  WHERE affiliate_id = v_affiliate_id;

  RAISE NOTICE 'Found % visits in referral_visits table', v_visit_count;

  -- Update affiliate click count to match actual visits
  UPDATE affiliates
  SET
    total_clicks = v_visit_count,
    updated_at = NOW()
  WHERE id = v_affiliate_id;

  RAISE NOTICE 'Updated total_clicks to %', v_visit_count;
  RAISE NOTICE 'Done!';

END $$;

-- Show the updated affiliate stats
SELECT
  referral_code,
  total_clicks,
  total_signups,
  total_conversions,
  (SELECT COUNT(*) FROM referral_visits WHERE affiliate_id = affiliates.id) as actual_visits,
  (SELECT COUNT(*) FROM referrals WHERE affiliate_id = affiliates.id) as actual_referrals
FROM affiliates
WHERE referral_code = 'SNSMAR';
