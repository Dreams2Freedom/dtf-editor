-- Enable RLS on all tables
ALTER TABLE processed_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
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

-- Create policies for processed_images
CREATE POLICY "Users can view their own processed images"
  ON processed_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own processed images"
  ON processed_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own processed images"
  ON processed_images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own processed images"
  ON processed_images FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for image_collections
CREATE POLICY "Users can view their own collections"
  ON image_collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own collections"
  ON image_collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
  ON image_collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
  ON image_collections FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for credit_transactions
CREATE POLICY "Users can view their own transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role should insert transactions
CREATE POLICY "Service role can insert transactions"
  ON credit_transactions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Create policies for images table
CREATE POLICY "Users can view their own images"
  ON images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own images"
  ON images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own images"
  ON images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images"
  ON images FOR DELETE
  USING (auth.uid() = user_id);