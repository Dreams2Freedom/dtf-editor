-- Fix storage bucket permissions for the 'images' bucket

-- First, check if the bucket exists
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE name = 'images';

-- Make the images bucket public if it isn't already
UPDATE storage.buckets
SET public = true
WHERE name = 'images';

-- Drop existing policies
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can manage their own files" ON storage.objects;

-- Create new policies for the images bucket

-- 1. Allow public read access to all files in the images bucket
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'images');

-- 2. Allow authenticated users to upload files to their own folder
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Allow users to update/delete their own files
CREATE POLICY "Users can manage their own files" ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'images' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Allow service role to manage all files (for server-side operations)
CREATE POLICY "Service role can manage all files" ON storage.objects
FOR ALL TO service_role
USING (bucket_id = 'images')
WITH CHECK (bucket_id = 'images');

-- Verify the policies
SELECT * FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';