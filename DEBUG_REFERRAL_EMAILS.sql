-- Debug why referral emails aren't showing

-- 1. Check what's in the referrals table
SELECT
  r.id,
  r.referred_user_id,
  r.created_at,
  r.status
FROM referrals r
WHERE r.affiliate_id IN (
  SELECT id FROM affiliates WHERE referral_code = 'SNSMAR'
)
ORDER BY r.created_at DESC
LIMIT 5;

-- 2. Check if those user IDs have profiles with emails
SELECT
  p.id,
  p.email,
  p.subscription_plan,
  p.subscription_status
FROM profiles p
WHERE p.id IN (
  SELECT referred_user_id
  FROM referrals
  WHERE affiliate_id IN (
    SELECT id FROM affiliates WHERE referral_code = 'SNSMAR'
  )
)
ORDER BY p.created_at DESC;

-- 3. Full join to see what's missing
SELECT
  r.id as referral_id,
  r.referred_user_id,
  r.created_at as referral_date,
  p.id as profile_id,
  p.email,
  CASE
    WHEN p.id IS NULL THEN 'PROFILE MISSING'
    WHEN p.email IS NULL THEN 'EMAIL IS NULL'
    ELSE 'OK'
  END as status
FROM referrals r
LEFT JOIN profiles p ON p.id = r.referred_user_id
WHERE r.affiliate_id IN (
  SELECT id FROM affiliates WHERE referral_code = 'SNSMAR'
)
ORDER BY r.created_at DESC
LIMIT 10;
