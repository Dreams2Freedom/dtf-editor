-- Check recent images to see what's being saved
SELECT 
    id,
    original_filename,
    processed_filename,
    operation_type,
    file_size,
    storage_url,
    thumbnail_url,
    created_at
FROM processed_images
WHERE user_id = 'f689bb22-89dd-4c3c-a941-d77feb84428d'
ORDER BY created_at DESC
LIMIT 10;

-- Check for duplicate entries created at the same time
SELECT 
    created_at,
    COUNT(*) as count,
    array_agg(original_filename) as filenames,
    array_agg(storage_url) as urls
FROM processed_images
WHERE user_id = 'f689bb22-89dd-4c3c-a941-d77feb84428d'
GROUP BY created_at
HAVING COUNT(*) > 1
ORDER BY created_at DESC;