-- Fix RLS policies for processed_images table to allow users to view their own images
-- This script ensures proper access control for the My Images gallery

-- First, drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own images" ON processed_images;
DROP POLICY IF EXISTS "Users can delete own images" ON processed_images;
DROP POLICY IF EXISTS "Users can update own images" ON processed_images;
DROP POLICY IF EXISTS "Service role has full access" ON processed_images;
DROP POLICY IF EXISTS "Service role bypass" ON processed_images;
DROP POLICY IF EXISTS "Service role can insert" ON processed_images;

-- Enable RLS if not already enabled
ALTER TABLE processed_images ENABLE ROW LEVEL SECURITY;

-- Create simple, clear policies

-- 1. Users can view their own images
CREATE POLICY "users_view_own_images" ON processed_images
  FOR SELECT 
  USING (auth.uid() = user_id);

-- 2. Users can insert their own images
CREATE POLICY "users_insert_own_images" ON processed_images
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 3. Users can update their own images
CREATE POLICY "users_update_own_images" ON processed_images
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Users can delete their own images
CREATE POLICY "users_delete_own_images" ON processed_images
  FOR DELETE 
  USING (auth.uid() = user_id);

-- 5. Service role can do everything (for backend operations)
CREATE POLICY "service_role_all_access" ON processed_images
  FOR ALL 
  USING (
    -- Check if it's a service role request
    auth.jwt()->>'role' = 'service_role' 
    OR 
    -- Fallback for direct service role key usage (where auth.uid() is NULL)
    (auth.uid() IS NULL AND current_setting('request.jwt.claims', true)::json->>'role' = 'service_role')
  );

-- Verify the policies are in place
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