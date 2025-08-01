-- Check if credit deduction functions exist
SELECT 
    p.proname AS function_name,
    pg_catalog.pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
AND p.proname IN ('use_credits_with_expiration', 'add_credit_transaction');

-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('credit_transactions', 'profiles', 'images', 'user_activity_logs');

-- Check profiles table columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND table_schema = 'public'
AND column_name LIKE '%credit%'
ORDER BY ordinal_position;