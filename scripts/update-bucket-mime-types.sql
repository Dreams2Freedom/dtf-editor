-- Update the images bucket to allow SVG files

-- First check current settings
SELECT 
  id, 
  name, 
  public,
  allowed_mime_types,
  file_size_limit
FROM storage.buckets
WHERE name = 'images';

-- Update the bucket to allow common image types including SVG
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',  -- SVG support
  'image/x-icon',
  'image/bmp'
]
WHERE name = 'images';

-- Verify the update
SELECT 
  id, 
  name, 
  public,
  allowed_mime_types,
  file_size_limit
FROM storage.buckets
WHERE name = 'images';