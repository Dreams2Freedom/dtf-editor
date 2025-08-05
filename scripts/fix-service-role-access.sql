-- Fix service role access and check if images exist

-- 1. First, grant service_role full access if not already done
GRANT ALL ON processed_images TO service_role;
GRANT ALL ON image_collections TO service_role;
GRANT ALL ON credit_transactions TO service_role;

-- 2. Check if service role policy exists and is correct
SELECT 
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'processed_images' 
AND 'service_role' = ANY(roles);

-- 3. Count all images in the table (as superuser, bypassing RLS)
SELECT COUNT(*) as total_images FROM processed_images;

-- 4. Show sample of recent images
SELECT 
    id,
    user_id,
    operation_type,
    processing_status,
    created_at,
    CASE WHEN storage_url IS NOT NULL THEN 'Has URL' ELSE 'No URL' END as has_url
FROM processed_images
ORDER BY created_at DESC
LIMIT 5;

-- 5. Check images for our test user
SELECT 
    COUNT(*) as user_images
FROM processed_images
WHERE user_id = 'f689bb22-89dd-4c3c-a941-d77feb84428d';

-- 6. Check if the RPC function works correctly
SELECT * FROM get_user_images('f689bb22-89dd-4c3c-a941-d77feb84428d') LIMIT 5;