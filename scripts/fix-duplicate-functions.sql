-- Check for duplicate functions
SELECT 
    proname as function_name,
    proargtypes::regtype[] as argument_types,
    COUNT(*) as count
FROM pg_proc
WHERE proname = 'calculate_image_expiration'
GROUP BY proname, proargtypes
HAVING COUNT(*) > 0;

-- Drop ALL versions of calculate_image_expiration
DROP FUNCTION IF EXISTS calculate_image_expiration(uuid) CASCADE;
DROP FUNCTION IF EXISTS calculate_image_expiration(uuid, interval) CASCADE;
DROP FUNCTION IF EXISTS calculate_image_expiration CASCADE;

-- Check if the RPC functions still exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('insert_processed_image', 'get_user_images', 'delete_processed_image')
ORDER BY routine_name;

-- Test the insert function
SELECT * FROM insert_processed_image(
    'f689bb22-89dd-4c3c-a941-d77feb84428d'::uuid,
    'test_after_fix.png',
    'test_after_fix_processed.png',
    'upscale',
    1024,
    'completed',
    'https://via.placeholder.com/150',
    'https://via.placeholder.com/150',
    '{"test": true, "after_fix": true}'::jsonb
);