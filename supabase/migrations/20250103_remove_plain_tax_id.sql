-- Migration: Remove plain text tax_id field to enforce encryption
-- Date: January 2025
-- Purpose: Security hardening - ensure tax IDs are only stored encrypted

-- First, check if any data exists in the tax_id column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'affiliates'
    AND column_name = 'tax_id'
  ) THEN
    -- Log warning if any non-null values exist
    IF EXISTS (SELECT 1 FROM public.affiliates WHERE tax_id IS NOT NULL) THEN
      RAISE NOTICE 'WARNING: Found non-null tax_id values. Run encrypt-existing-tax-data.js script first!';
    END IF;

    -- Drop the plain text tax_id column
    ALTER TABLE public.affiliates DROP COLUMN IF EXISTS tax_id CASCADE;
    RAISE NOTICE 'Removed plain text tax_id column from affiliates table';
  ELSE
    RAISE NOTICE 'tax_id column does not exist, skipping removal';
  END IF;
END $$;

-- Add comment to tax_id_encrypted field for documentation
COMMENT ON COLUMN public.affiliates.tax_id_encrypted IS 'AES-256-GCM encrypted tax identification number (SSN/EIN). Never store unencrypted.';

-- Add comment to tax_form_data field
COMMENT ON COLUMN public.affiliates.tax_form_data IS 'Encrypted tax form data. Must be encrypted before storage.';

-- Create a check constraint to ensure tax_id_encrypted is properly formatted (if provided)
ALTER TABLE public.affiliates
ADD CONSTRAINT check_tax_id_encrypted_format
CHECK (
  tax_id_encrypted IS NULL
  OR LENGTH(tax_id_encrypted) >= 64  -- Base64 encoded encrypted data should be at least this long
);

-- Create an audit table for tax data access (for compliance)
CREATE TABLE IF NOT EXISTS public.tax_data_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- 'view', 'update', 'export'
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for audit log queries
CREATE INDEX idx_tax_audit_affiliate ON public.tax_data_audit_log(affiliate_id);
CREATE INDEX idx_tax_audit_user ON public.tax_data_audit_log(user_id);
CREATE INDEX idx_tax_audit_created ON public.tax_data_audit_log(created_at);

-- Enable RLS on audit log
ALTER TABLE public.tax_data_audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can insert audit logs
CREATE POLICY "Service role can insert audit logs"
  ON public.tax_data_audit_log FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Only service role can view audit logs
CREATE POLICY "Service role can view audit logs"
  ON public.tax_data_audit_log FOR SELECT
  TO service_role
  USING (true);

-- Add function to validate encrypted data format
CREATE OR REPLACE FUNCTION is_valid_encrypted_format(encrypted_text TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if it's a valid base64 string of sufficient length
  IF encrypted_text IS NULL THEN
    RETURN TRUE; -- NULL is valid (no data)
  END IF;

  -- Check minimum length (IV:16 + AuthTag:16 + MinData:16 = 48 bytes = 64 chars base64)
  IF LENGTH(encrypted_text) < 64 THEN
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
$$ LANGUAGE plpgsql;

-- Add trigger to validate encrypted data on insert/update
CREATE OR REPLACE FUNCTION validate_encrypted_tax_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate tax_id_encrypted format if provided
  IF NEW.tax_id_encrypted IS NOT NULL AND NOT is_valid_encrypted_format(NEW.tax_id_encrypted) THEN
    RAISE EXCEPTION 'Invalid encrypted tax_id format. Data must be properly encrypted.';
  END IF;

  -- Log if tax form is marked as completed but no encrypted ID
  IF NEW.tax_form_completed = TRUE AND NEW.tax_id_encrypted IS NULL THEN
    RAISE NOTICE 'Warning: Tax form marked as completed but no encrypted tax ID stored';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS validate_tax_encryption ON public.affiliates;
CREATE TRIGGER validate_tax_encryption
  BEFORE INSERT OR UPDATE ON public.affiliates
  FOR EACH ROW
  EXECUTE FUNCTION validate_encrypted_tax_data();

-- Grant necessary permissions
GRANT ALL ON public.tax_data_audit_log TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;