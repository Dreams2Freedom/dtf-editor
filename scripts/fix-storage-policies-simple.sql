-- Fix Storage Policies for DTF Editor
-- Run this in Supabase SQL Editor

-- Start transaction
BEGIN;

-- Clean up existing policies
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to images" ON storage.objects;
DROP POLICY IF EXISTS "Users can manage their own images in user-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own images in user-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to user-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their uploads" ON storage.objects;

-- Create policies for 'images' bucket
CREATE POLICY "images_insert_own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'images' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "images_select_own" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'images' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "images_delete_own" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'images' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

-- Create policies for 'user-images' bucket
CREATE POLICY "user_images_all_own" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'user-images' AND auth.uid()::text = (string_to_array(name, '/'))[1])
WITH CHECK (bucket_id = 'user-images' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

-- Create policies for 'user-uploads' bucket
CREATE POLICY "user_uploads_insert_own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'user-uploads' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "user_uploads_select_own" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'user-uploads' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "user_uploads_delete_own" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'user-uploads' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

-- Commit transaction
COMMIT;

-- Verify policies (run separately after commit)
SELECT policyname, cmd, bucket_id 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;