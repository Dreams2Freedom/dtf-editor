-- Clean up duplicate RLS policies for processed_images table

-- Drop the duplicate/old policies
DROP POLICY IF EXISTS "Service role full access" ON processed_images;
DROP POLICY IF EXISTS "Users can insert own images" ON processed_images;

-- Verify the remaining policies
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
WHERE tablename = 'processed_images'
ORDER BY policyname;

-- Test that users can now select their images
-- This should return images for the logged-in user
SELECT COUNT(*) as image_count 
FROM processed_images 
WHERE user_id = auth.uid();