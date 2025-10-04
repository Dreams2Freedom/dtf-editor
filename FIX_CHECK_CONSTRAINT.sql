-- Fix Check Constraint for Tax ID Encryption
-- The check constraint is hardcoded to require 64 characters, but encrypted SSNs are only 60 chars
-- This updates it to use our fixed validation function (44 char minimum)

-- Drop the old hardcoded constraint
ALTER TABLE public.affiliates
DROP CONSTRAINT IF EXISTS check_tax_id_encrypted_format;

-- Add new constraint using the updated validation function
ALTER TABLE public.affiliates
ADD CONSTRAINT check_tax_id_encrypted_format
CHECK (is_valid_encrypted_format(tax_id_encrypted));

-- Verify the constraint was updated
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as new_constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.affiliates'::regclass
  AND conname = 'check_tax_id_encrypted_format';

-- Test that a 60-character encrypted value would now pass
SELECT
  'Test 60 char encrypted SSN' as test_description,
  is_valid_encrypted_format('FdCiGB4N2voihtZj/cCau/6edNMKjJPRD5YquJRDrq0yxegX+cuEfZ++UA==') as passes_validation,
  LENGTH('FdCiGB4N2voihtZj/cCau/6edNMKjJPRD5YquJRDrq0yxegX+cuEfZ++UA==') as length_chars;
