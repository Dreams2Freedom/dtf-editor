-- Add expires_at column to processed_images if it doesn't exist
ALTER TABLE public.processed_images 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_processed_images_expires_at 
ON public.processed_images(expires_at) 
WHERE expires_at IS NOT NULL;

-- Create a function to calculate image expiration date
CREATE OR REPLACE FUNCTION calculate_image_expiration(
  p_user_id UUID,
  p_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  v_profile RECORD;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get user profile (fixed: use 'id' instead of 'user_id')
  SELECT 
    subscription_plan,
    subscription_status,
    last_credit_purchase_at
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  -- Paid users: images never expire
  IF v_profile.subscription_plan != 'free' OR v_profile.subscription_status = 'active' THEN
    RETURN NULL;
  END IF;

  -- Pay-as-you-go users: 90 days from last credit purchase
  IF v_profile.last_credit_purchase_at IS NOT NULL THEN
    -- Check if credit purchase is recent (within 90 days)
    IF v_profile.last_credit_purchase_at > (NOW() - INTERVAL '90 days') THEN
      -- Image expires 90 days after the credit purchase
      RETURN v_profile.last_credit_purchase_at + INTERVAL '90 days';
    END IF;
  END IF;

  -- Free users: 48 hours from creation
  RETURN p_created_at + INTERVAL '48 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to set expires_at when images are created
CREATE OR REPLACE FUNCTION set_image_expiration()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at = calculate_image_expiration(NEW.user_id, NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_image_created_set_expiration ON public.processed_images;

CREATE TRIGGER on_image_created_set_expiration
  BEFORE INSERT ON public.processed_images
  FOR EACH ROW
  EXECUTE FUNCTION set_image_expiration();

-- Update existing images with expiration dates
UPDATE public.processed_images
SET expires_at = calculate_image_expiration(user_id, created_at)
WHERE expires_at IS NULL;

-- Drop existing cleanup function if it exists
DROP FUNCTION IF EXISTS cleanup_expired_images();

-- Create a function to clean up expired images
CREATE OR REPLACE FUNCTION cleanup_expired_images()
RETURNS TABLE(deleted_count INTEGER, error_count INTEGER) AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_image RECORD;
BEGIN
  -- Find all expired images
  FOR v_image IN 
    SELECT id, user_id, storage_url, thumbnail_url
    FROM public.processed_images
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW()
  LOOP
    BEGIN
      -- Delete the database record (storage deletion handled by Edge Function)
      DELETE FROM public.processed_images WHERE id = v_image.id;
      v_deleted_count := v_deleted_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      -- Log error but continue processing
      RAISE NOTICE 'Error deleting image %: %', v_image.id, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT v_deleted_count, v_error_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to recalculate expiration when user plan changes
CREATE OR REPLACE FUNCTION update_image_expirations_on_plan_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if subscription plan or status changed
  IF (OLD.subscription_plan IS DISTINCT FROM NEW.subscription_plan) OR
     (OLD.subscription_status IS DISTINCT FROM NEW.subscription_status) OR
     (OLD.last_credit_purchase_at IS DISTINCT FROM NEW.last_credit_purchase_at) THEN
    
    -- Update all user's images (fixed: use 'id' instead of 'user_id')
    UPDATE public.processed_images
    SET expires_at = calculate_image_expiration(NEW.id, created_at)
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_profile_plan_change_update_expirations ON public.profiles;

CREATE TRIGGER on_profile_plan_change_update_expirations
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_image_expirations_on_plan_change();