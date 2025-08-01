-- Fix RLS policies for processed_images table - Version 2
-- This version creates a proper service role bypass

-- First, drop ALL existing policies
DROP POLICY IF EXISTS "Service role has full access" ON processed_images;
DROP POLICY IF EXISTS "Service role bypass" ON processed_images;
DROP POLICY IF EXISTS "Service role can insert" ON processed_images;
DROP POLICY IF EXISTS "Users can view own images" ON processed_images;
DROP POLICY IF EXISTS "Users can delete own images" ON processed_images;
DROP POLICY IF EXISTS "Users can update own images" ON processed_images;

-- Create a single comprehensive policy for service role
-- The key is checking if the current role is service_role
CREATE POLICY "Service role full access" ON processed_images
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create policies for authenticated users
CREATE POLICY "Users can view own images" ON processed_images
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own images" ON processed_images
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own images" ON processed_images
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own images" ON processed_images
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'processed_images';