-- Fix existing images that have signed URLs instead of storage paths

-- First, check what we have
SELECT 
  id,
  processed_filename,
  storage_url,
  LENGTH(storage_url) as url_length,
  CASE 
    WHEN storage_url LIKE '%token=%' THEN 'signed_url'
    WHEN storage_url LIKE 'data:%' THEN 'data_url'
    WHEN storage_url LIKE '%/storage/v1/object/public/%' THEN 'public_url'
    WHEN storage_url LIKE '%/processed/%' THEN 'path'
    ELSE 'unknown'
  END as url_type,
  metadata->>'storage_path' as metadata_path
FROM processed_images
ORDER BY created_at DESC
LIMIT 20;

-- Update images that have signed URLs to use the storage path from metadata
UPDATE processed_images
SET 
  storage_url = metadata->>'storage_path',
  thumbnail_url = metadata->>'storage_path'
WHERE 
  storage_url LIKE '%token=%' 
  AND metadata->>'storage_path' IS NOT NULL
  AND metadata->>'storage_path' != '';

-- For images that don't have storage_path in metadata, extract it from the URL
UPDATE processed_images
SET 
  storage_url = REGEXP_REPLACE(
    REGEXP_REPLACE(storage_url, '^.*/storage/v1/object/public/images/', ''),
    '\?.*$', ''
  ),
  thumbnail_url = REGEXP_REPLACE(
    REGEXP_REPLACE(thumbnail_url, '^.*/storage/v1/object/public/images/', ''),
    '\?.*$', ''
  )
WHERE 
  storage_url LIKE '%token=%'
  AND (metadata->>'storage_path' IS NULL OR metadata->>'storage_path' = '');

-- Verify the fix
SELECT 
  id,
  processed_filename,
  storage_url,
  CASE 
    WHEN storage_url LIKE '%token=%' THEN 'STILL HAS TOKEN - NEEDS FIX'
    WHEN storage_url LIKE '%/processed/%' THEN 'path_only - GOOD'
    ELSE 'other'
  END as status
FROM processed_images
ORDER BY created_at DESC
LIMIT 20;