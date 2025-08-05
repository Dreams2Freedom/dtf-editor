-- First, let's see what's in the insert_processed_image function
SELECT pg_get_functiondef('insert_processed_image'::regproc);

-- Create the missing calculate_image_expiration function
-- This function likely calculates when an image should expire
CREATE OR REPLACE FUNCTION calculate_image_expiration(p_user_id UUID)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  -- For now, let's set images to never expire (return NULL)
  -- You can adjust this logic based on your business rules
  RETURN NULL;
  
  -- Alternative: Set expiration to 30 days from now
  -- RETURN NOW() + INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Now recreate the insert_processed_image function without the expiration call
DROP FUNCTION IF EXISTS insert_processed_image(uuid,text,text,text,bigint,text,text,text,jsonb);

CREATE OR REPLACE FUNCTION insert_processed_image(
  p_user_id UUID,
  p_original_filename TEXT,
  p_processed_filename TEXT,
  p_operation_type TEXT,
  p_file_size BIGINT,
  p_processing_status TEXT,
  p_storage_url TEXT,
  p_thumbnail_url TEXT,
  p_metadata JSONB DEFAULT '{}'::JSONB
) RETURNS UUID AS $$
DECLARE
  v_image_id UUID;
BEGIN
  INSERT INTO processed_images (
    user_id,
    original_filename,
    processed_filename,
    operation_type,
    file_size,
    processing_status,
    storage_url,
    thumbnail_url,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_original_filename,
    p_processed_filename,
    p_operation_type,
    p_file_size,
    p_processing_status,
    p_storage_url,
    p_thumbnail_url,
    p_metadata,
    NOW(),
    NOW()
  ) RETURNING id INTO v_image_id;
  
  RETURN v_image_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION insert_processed_image TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_image_expiration TO authenticated;

-- Test the function
SELECT * FROM insert_processed_image(
    'f689bb22-89dd-4c3c-a941-d77feb84428d'::uuid,
    'test_fixed.png',
    'test_fixed_processed.png',
    'upscale',
    1024,
    'completed',
    'https://via.placeholder.com/150',
    'https://via.placeholder.com/150',
    '{"test": true, "fixed": true}'::jsonb
);