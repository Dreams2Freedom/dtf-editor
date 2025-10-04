-- Check for constraints on affiliates table that might be blocking tax_id updates

-- 1. Check all constraints on affiliates table
SELECT
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.affiliates'::regclass
ORDER BY conname;

-- Constraint types:
-- c = check constraint
-- f = foreign key
-- p = primary key
-- u = unique constraint
-- t = constraint trigger
-- x = exclusion constraint
