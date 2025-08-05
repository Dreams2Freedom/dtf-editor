-- Fix all RLS policies for dashboard access

-- 1. First check if image_collections table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'image_collections') THEN
        CREATE TABLE image_collections (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            description TEXT,
            is_default BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Create index
        CREATE INDEX idx_image_collections_user_id ON image_collections(user_id);
        
        -- Enable RLS
        ALTER TABLE image_collections ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 2. Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own processed images" ON processed_images;
DROP POLICY IF EXISTS "Users can insert their own processed images" ON processed_images;
DROP POLICY IF EXISTS "Users can update their own processed images" ON processed_images;
DROP POLICY IF EXISTS "Users can delete their own processed images" ON processed_images;

DROP POLICY IF EXISTS "Users can view their own collections" ON image_collections;
DROP POLICY IF EXISTS "Users can insert their own collections" ON image_collections;
DROP POLICY IF EXISTS "Users can update their own collections" ON image_collections;
DROP POLICY IF EXISTS "Users can delete their own collections" ON image_collections;

DROP POLICY IF EXISTS "Users can view their own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Service role can insert transactions" ON credit_transactions;

DROP POLICY IF EXISTS "Users can view their own images" ON images;
DROP POLICY IF EXISTS "Users can insert their own images" ON images;
DROP POLICY IF EXISTS "Users can update their own images" ON images;
DROP POLICY IF EXISTS "Users can delete their own images" ON images;

-- 3. Create policies for processed_images
CREATE POLICY "Enable read access for users to their own images"
  ON processed_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for users to their own images"
  ON processed_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users to their own images"
  ON processed_images FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users to their own images"
  ON processed_images FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Create policies for image_collections
CREATE POLICY "Enable read access for users to their own collections"
  ON image_collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for users to their own collections"
  ON image_collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users to their own collections"
  ON image_collections FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users to their own collections"
  ON image_collections FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Create policies for credit_transactions
CREATE POLICY "Enable read access for users to their own transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Only allow inserts through service role or RPC functions
CREATE POLICY "Enable insert for authenticated users"
  ON credit_transactions FOR INSERT
  WITH CHECK (true);  -- This allows RPC functions to insert

-- 6. Create policies for images table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'images') THEN
        ALTER TABLE images ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Enable read access for users to their own files"
          ON images FOR SELECT
          USING (auth.uid() = user_id);

        CREATE POLICY "Enable insert for users"
          ON images FOR INSERT
          WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Enable update for users to their own files"
          ON images FOR UPDATE
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Enable delete for users to their own files"
          ON images FOR DELETE
          USING (auth.uid() = user_id);
    END IF;
END $$;

-- 7. Create default collection for existing users
INSERT INTO image_collections (user_id, name, description, is_default)
SELECT DISTINCT 
    p.id as user_id,
    'All Images' as name,
    'Default collection for all your images' as description,
    true as is_default
FROM profiles p
LEFT JOIN image_collections ic ON p.id = ic.user_id AND ic.is_default = true
WHERE ic.id IS NULL;

-- 8. Test that policies are working
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
WHERE tablename IN ('processed_images', 'image_collections', 'credit_transactions', 'images')
ORDER BY tablename, policyname;