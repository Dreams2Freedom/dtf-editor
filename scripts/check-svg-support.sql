-- Check if the images bucket supports SVG files

-- Check bucket configuration
SELECT 
  id, 
  name, 
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'images';

-- Check if there are any SVG files already stored
SELECT 
  COUNT(*) as svg_count,
  MIN(created_at) as first_svg,
  MAX(created_at) as latest_svg
FROM storage.objects
WHERE 
  bucket_id = 'images' 
  AND (name LIKE '%.svg' OR metadata->>'mimetype' = 'image/svg+xml');

-- Check if there are any vectorization entries in processed_images
SELECT 
  COUNT(*) as vector_count,
  MIN(created_at) as first_vector,
  MAX(created_at) as latest_vector
FROM processed_images
WHERE operation_type = 'vectorization';

-- Check a few recent vectorization attempts
SELECT 
  id,
  processed_filename,
  storage_url,
  file_size,
  processing_status,
  created_at
FROM processed_images
WHERE operation_type = 'vectorization'
ORDER BY created_at DESC
LIMIT 5;