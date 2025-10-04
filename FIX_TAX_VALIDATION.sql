-- Fix Tax ID Encryption Validation
-- The current validation requires 64 characters (48 bytes), but SSNs are only 11 characters
-- which produces ~43 bytes encrypted (16 IV + 16 AuthTag + 11 data) = 60 chars base64
-- This migration updates the validation to accept 44+ characters (32+ bytes: 16 IV + 16 AuthTag + min data)

-- Drop and recreate the validation function with corrected minimum length
CREATE OR REPLACE FUNCTION is_valid_encrypted_format(encrypted_text TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if it's a valid base64 string of sufficient length
  IF encrypted_text IS NULL THEN
    RETURN TRUE; -- NULL is valid (no data)
  END IF;

  -- Updated: Check minimum length (IV:16 + AuthTag:16 = 32 bytes minimum = 44 chars base64)
  -- Previous was 64 chars (48 bytes) which was too strict for short data like SSNs
  IF LENGTH(encrypted_text) < 44 THEN
    RETURN FALSE;
  END IF;

  -- Check if it's valid base64
  BEGIN
    PERFORM decode(encrypted_text, 'base64');
    RETURN TRUE;
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
  END;
END;
$$;

-- Test the updated validation
DO $$
DECLARE
  test_encrypted TEXT := 'FdCiGB4N2voihtZj/cCau/6edNMKjJPRD5YquJRDrq0yxegX+cuEfZ++UA=='; -- 60 chars
  is_valid BOOLEAN;
BEGIN
  SELECT is_valid_encrypted_format(test_encrypted) INTO is_valid;

  IF is_valid THEN
    RAISE NOTICE '✅ Validation updated successfully - 60 character encrypted SSN now passes';
  ELSE
    RAISE NOTICE '❌ Validation still failing - manual review needed';
  END IF;
END $$;

-- Verify the change
SELECT
  'Minimum length check' as test,
  is_valid_encrypted_format('FdCiGB4N2voihtZj/cCau/6edNMKjJPRD5YquJRDrq0yxegX+cuEfZ++UA==') as passes_validation,
  LENGTH('FdCiGB4N2voihtZj/cCau/6edNMKjJPRD5YquJRDrq0yxegX+cuEfZ++UA==') as encrypted_length;
