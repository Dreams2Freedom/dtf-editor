-- First, let's see what's in the current insert_processed_image function
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'insert_processed_image';

-- Drop the old version
DROP FUNCTION IF EXISTS insert_processed_image(uuid,text,text,text,bigint,text,text,text,jsonb);

-- Create a clean version without any expiration logic
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
  -- Direct insert without any function calls
  INSERT INTO processed_images (
    id,
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
    gen_random_uuid(),
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
GRANT EXECUTE ON FUNCTION insert_processed_image TO service_role;

-- Test the new function
SELECT insert_processed_image(
    'f689bb22-89dd-4c3c-a941-d77feb84428d'::uuid,
    'test_clean_insert.png',
    'test_clean_insert_processed.png',
    'upscale',
    1024,
    'completed',
    'https://via.placeholder.com/150',
    'https://via.placeholder.com/150',
    '{"test": true, "clean_insert": true}'::jsonb
) as new_image_id;

-- Verify
SELECT COUNT(*) as total_test_images
FROM processed_images 
WHERE user_id = 'f689bb22-89dd-4c3c-a941-d77feb84428d'
AND original_filename LIKE 'test_%';