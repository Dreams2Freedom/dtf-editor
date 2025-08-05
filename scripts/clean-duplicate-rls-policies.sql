-- Clean up duplicate RLS policies

-- 1. Drop ALL existing policies to remove duplicates
-- For processed_images
DROP POLICY IF EXISTS "Enable delete for users to their own images" ON processed_images;
DROP POLICY IF EXISTS "Enable insert for users to their own images" ON processed_images;
DROP POLICY IF EXISTS "Enable read access for users to their own images" ON processed_images;
DROP POLICY IF EXISTS "Enable update for users to their own images" ON processed_images;
DROP POLICY IF EXISTS "Service role full access" ON processed_images;
DROP POLICY IF EXISTS "Users can delete own images" ON processed_images;
DROP POLICY IF EXISTS "Users can insert own images" ON processed_images;
DROP POLICY IF EXISTS "Users can update own images" ON processed_images;
DROP POLICY IF EXISTS "Users can view own images" ON processed_images;

-- For image_collections
DROP POLICY IF EXISTS "Enable delete for users to their own collections" ON image_collections;
DROP POLICY IF EXISTS "Enable insert for users to their own collections" ON image_collections;
DROP POLICY IF EXISTS "Enable read access for users to their own collections" ON image_collections;
DROP POLICY IF EXISTS "Enable update for users to their own collections" ON image_collections;
DROP POLICY IF EXISTS "Users can create own collections" ON image_collections;
DROP POLICY IF EXISTS "Users can delete own collections" ON image_collections;
DROP POLICY IF EXISTS "Users can update own collections" ON image_collections;
DROP POLICY IF EXISTS "Users can view own collections" ON image_collections;

-- For credit_transactions
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON credit_transactions;
DROP POLICY IF EXISTS "Enable read access for users to their own transactions" ON credit_transactions;

-- For images
DROP POLICY IF EXISTS "Enable delete for users to their own files" ON images;
DROP POLICY IF EXISTS "Enable insert for users" ON images;
DROP POLICY IF EXISTS "Enable read access for users to their own files" ON images;
DROP POLICY IF EXISTS "Enable update for users to their own files" ON images;
DROP POLICY IF EXISTS "images_user_own" ON images;

-- 2. Create clean policies - ONLY for authenticated users (not public)
-- For processed_images
CREATE POLICY "Users can view own images"
  ON processed_images FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own images"
  ON processed_images FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own images"
  ON processed_images FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own images"
  ON processed_images FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role needs full access for RPC functions
CREATE POLICY "Service role full access"
  ON processed_images FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- For image_collections
CREATE POLICY "Users can view own collections"
  ON image_collections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own collections"
  ON image_collections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections"
  ON image_collections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections"
  ON image_collections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- For credit_transactions
CREATE POLICY "Users can view own transactions"
  ON credit_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow service role to insert transactions
CREATE POLICY "Service role can insert transactions"
  ON credit_transactions FOR INSERT
  TO service_role
  WITH CHECK (true);

-- For images table
CREATE POLICY "Users can view own files"
  ON images FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upload files"
  ON images FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own files"
  ON images FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own files"
  ON images FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Verify the cleanup
SELECT 
    tablename,
    COUNT(*) as policy_count,
    string_agg(policyname, ', ') as policies
FROM pg_policies 
WHERE tablename IN ('processed_images', 'image_collections', 'credit_transactions', 'images')
GROUP BY tablename
ORDER BY tablename;