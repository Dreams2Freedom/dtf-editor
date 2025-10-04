-- Verify the tax form was actually saved
-- Run this to see what's in the database

SELECT
  id,
  user_id,
  referral_code,
  tax_form_type,
  tax_form_completed,
  tax_form_completed_at,
  LENGTH(tax_id_encrypted) as encrypted_length,
  tax_form_data->>'encrypted' IS NOT NULL as has_encrypted_data
FROM public.affiliates
WHERE referral_code = 'SNSMAR'
  OR user_id = (SELECT id FROM auth.users WHERE email = 'snsmarketing@gmail.com');
