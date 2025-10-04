-- Check if tax form columns exist in affiliates table
-- Run this in Supabase SQL Editor

-- 1. Check all columns in affiliates table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'affiliates'
ORDER BY ordinal_position;

-- 2. Specifically check for tax form columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'affiliates'
  AND column_name IN (
    'tax_form_type',
    'tax_form_completed',
    'tax_form_completed_at',
    'tax_id_encrypted',
    'tax_form_data'
  );

-- 3. If missing, here's the SQL to add them:
-- ALTER TABLE public.affiliates
-- ADD COLUMN IF NOT EXISTS tax_form_type VARCHAR(10),
-- ADD COLUMN IF NOT EXISTS tax_form_completed BOOLEAN DEFAULT FALSE,
-- ADD COLUMN IF NOT EXISTS tax_form_completed_at TIMESTAMPTZ,
-- ADD COLUMN IF NOT EXISTS tax_id_encrypted TEXT,
-- ADD COLUMN IF NOT EXISTS tax_form_data JSONB;
