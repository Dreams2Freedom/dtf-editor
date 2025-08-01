-- Force set credits for Shannon's account
-- Run this in Supabase SQL editor if needed

UPDATE profiles
SET 
  credits_remaining = 10,
  updated_at = NOW()
WHERE email = 'shannonherod@gmail.com';

-- Verify the update
SELECT id, email, credits_remaining, updated_at
FROM profiles
WHERE email = 'shannonherod@gmail.com';