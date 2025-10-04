-- Check for triggers and functions on affiliates table
-- Run this in Supabase SQL Editor

-- 1. Check all triggers on affiliates table
SELECT
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'affiliates'
ORDER BY trigger_name;

-- 2. Check all functions that might validate tax_id
SELECT
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name LIKE '%tax%'
    OR routine_name LIKE '%encrypt%'
    OR routine_name LIKE '%validate%'
  )
ORDER BY routine_name;

-- 3. Check constraints on affiliates table
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.affiliates'::regclass
ORDER BY conname;

-- 4. If there's a validation trigger, you may need to disable it temporarily:
-- ALTER TABLE public.affiliates DISABLE TRIGGER <trigger_name>;
-- Or modify the validation function to accept our encryption format
