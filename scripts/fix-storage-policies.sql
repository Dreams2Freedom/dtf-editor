-- Fix Storage Policies for DTF Editor
-- This script sets up proper RLS policies for storage buckets

-- For the 'images' bucket (public bucket for processed images)
-- Allow users to only access their own folders
BEGIN;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to images" ON storage.objects;

-- Create new policies for 'images' bucket
-- 1. Users can upload to their own folder only
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images' AND
  (auth.uid()::text = (string_to_array(name, '/'))[1])
);

-- 2. Users can view their own images
CREATE POLICY "Users can view their own images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'images' AND
  (auth.uid()::text = (string_to_array(name, '/'))[1])
);

-- 3. Users can delete their own images
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'images' AND
  (auth.uid()::text = (string_to_array(name, '/'))[1])
);

-- 4. Public read access for processed images (for sharing/display purposes)
-- This is optional - remove if you want images to be completely private
CREATE POLICY "Public read access to images"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'images' AND
  -- Only allow public access to files in 'public' subdirectory
  (string_to_array(name, '/'))[2] = 'public'
);

-- For the 'user-images' bucket (private bucket)
DROP POLICY IF EXISTS "Users can manage their own images in user-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own images in user-images" ON storage.objects;

-- Users can upload/update/delete their own images
CREATE POLICY "Users can manage their own images in user-images"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'user-images' AND
  (auth.uid()::text = (string_to_array(name, '/'))[1])
)
WITH CHECK (
  bucket_id = 'user-images' AND
  (auth.uid()::text = (string_to_array(name, '/'))[1])
);

-- For the 'user-uploads' bucket
DROP POLICY IF EXISTS "Users can upload to user-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their uploads" ON storage.objects;

-- Users can upload to their own folder
CREATE POLICY "Users can upload to user-uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-uploads' AND
  (auth.uid()::text = (string_to_array(name, '/'))[1])
);

-- Users can view their own uploads
CREATE POLICY "Users can view their uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-uploads' AND
  (auth.uid()::text = (string_to_array(name, '/'))[1])
);

-- Users can delete their own uploads
CREATE POLICY "Users can delete their uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-uploads' AND
  (auth.uid()::text = (string_to_array(name, '/'))[1])
);

COMMIT;

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;