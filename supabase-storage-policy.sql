-- Allow users to access only their own files
CREATE POLICY "Users can access their own files"
ON storage.objects
FOR ALL
USING (
  auth.role() = 'authenticated'
  AND bucket_id = 'user-images' AND (storage.foldername(name))1= auth.uid()::text
);

-- Alternative simpler policy if the above doesnt work:
-- CREATE POLICY "Users can access their own files"
-- ON storage.objects
-- FOR ALL
-- USING (
--   auth.role() = 'authenticated'
--   AND bucket_id = 'user-images'
--   AND name LIKE auth.uid()::text || '/%'
-- ); 