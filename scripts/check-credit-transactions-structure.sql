-- Check the actual structure of credit_transactions table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'credit_transactions'
ORDER BY ordinal_position;