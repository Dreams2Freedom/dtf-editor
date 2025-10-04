-- Check if tracking data is being recorded for SNSMAR

-- 1. Get the affiliate ID for SNSMAR
SELECT
  id,
  referral_code,
  total_clicks,
  total_signups,
  total_conversions,
  created_at,
  updated_at
FROM affiliates
WHERE referral_code = 'SNSMAR';

-- 2. Count actual visits in referral_visits table
SELECT COUNT(*) as visit_count
FROM referral_visits
WHERE affiliate_id IN (
  SELECT id FROM affiliates WHERE referral_code = 'SNSMAR'
);

-- 3. Show recent visits (last 10)
SELECT
  id,
  referral_code,
  cookie_id,
  landing_page,
  ip_address,
  user_agent,
  created_at
FROM referral_visits
WHERE affiliate_id IN (
  SELECT id FROM affiliates WHERE referral_code = 'SNSMAR'
)
ORDER BY created_at DESC
LIMIT 10;

-- 4. Show referrals for this affiliate
SELECT
  id,
  referred_user_id,
  referral_code,
  cookie_id,
  status,
  signed_up_at,
  created_at
FROM referrals
WHERE affiliate_id IN (
  SELECT id FROM affiliates WHERE referral_code = 'SNSMAR'
)
ORDER BY created_at DESC
LIMIT 10;
