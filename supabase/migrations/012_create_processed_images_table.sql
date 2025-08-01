-- Create processed_images table for storing user's processed images
CREATE TABLE IF NOT EXISTS processed_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  processed_filename TEXT,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('upscale', 'background-removal', 'vectorize', 'generate')),
  file_size BIGINT NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  storage_url TEXT,
  thumbnail_url TEXT,
  storage_path TEXT, -- Internal storage path in Supabase Storage
  expires_at TIMESTAMP WITH TIME ZONE, -- When the image will be deleted
  metadata JSONB DEFAULT '{}', -- Additional metadata like credits_used, processing_time_ms, api_used
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_processed_images_user_id ON processed_images(user_id);
CREATE INDEX idx_processed_images_created_at ON processed_images(created_at DESC);
CREATE INDEX idx_processed_images_operation_type ON processed_images(operation_type);
CREATE INDEX idx_processed_images_expires_at ON processed_images(expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE processed_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own images
CREATE POLICY "Users can view own images" ON processed_images
  FOR SELECT USING (auth.uid() = user_id);

-- Users can delete their own images
CREATE POLICY "Users can delete own images" ON processed_images
  FOR DELETE USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role has full access" ON processed_images
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Function to calculate expiration date based on user's plan
CREATE OR REPLACE FUNCTION calculate_image_expiration(p_user_id UUID)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  v_profile RECORD;
  v_expiration TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get user's profile
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  
  -- Paid users (non-free plans) get permanent storage
  IF v_profile.subscription_plan IS NOT NULL AND v_profile.subscription_plan != 'free' THEN
    RETURN NULL; -- No expiration
  END IF;
  
  -- Check if user has made credit purchases (pay-as-you-go)
  IF EXISTS (
    SELECT 1 FROM credit_transactions 
    WHERE user_id = p_user_id 
    AND type = 'purchase' 
    AND created_at > now() - INTERVAL '90 days'
  ) THEN
    -- 90 days from now
    RETURN now() + INTERVAL '90 days';
  END IF;
  
  -- Free users: 48 hours
  RETURN now() + INTERVAL '48 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired images (to be called by a cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_images()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete expired images
  WITH deleted AS (
    DELETE FROM processed_images
    WHERE expires_at IS NOT NULL AND expires_at < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON TABLE processed_images IS 'Stores metadata and URLs for user processed images with automatic expiration based on user plan';
COMMENT ON FUNCTION calculate_image_expiration IS 'Calculates when an image should expire based on user subscription status';
COMMENT ON FUNCTION cleanup_expired_images IS 'Removes expired images from the database - should be called by a scheduled job';