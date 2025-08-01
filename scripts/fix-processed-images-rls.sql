-- Fix RLS policies for processed_images table
-- The service role policy needs to be adjusted to work with direct service role key usage

-- Drop the existing service role policy
DROP POLICY IF EXISTS "Service role has full access" ON processed_images;

-- Create a new policy that allows service role to bypass RLS
-- When using service_role key directly, auth.uid() is NULL
CREATE POLICY "Service role bypass" ON processed_images
  FOR ALL 
  USING (
    -- Allow if using service role (no auth.uid())
    auth.uid() IS NULL 
    OR 
    -- Allow if authenticated user owns the record
    auth.uid() = user_id
  );

-- Also need to allow inserts for service role
CREATE POLICY "Service role can insert" ON processed_images
  FOR INSERT 
  WITH CHECK (
    -- Allow if using service role (no auth.uid())
    auth.uid() IS NULL 
    OR 
    -- Allow if authenticated user is inserting their own record
    auth.uid() = user_id
  );

-- Update policies to be more explicit
DROP POLICY IF EXISTS "Users can view own images" ON processed_images;
DROP POLICY IF EXISTS "Users can delete own images" ON processed_images;

-- Users can view their own images
CREATE POLICY "Users can view own images" ON processed_images
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can delete their own images  
CREATE POLICY "Users can delete own images" ON processed_images
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Users can update their own images (e.g., marking as favorite)
CREATE POLICY "Users can update own images" ON processed_images
  FOR UPDATE 
  USING (auth.uid() = user_id);