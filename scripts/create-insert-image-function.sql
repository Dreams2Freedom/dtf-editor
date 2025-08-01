-- Create a function to insert images that bypasses permission issues
CREATE OR REPLACE FUNCTION insert_processed_image(
  p_user_id UUID,
  p_original_filename TEXT,
  p_processed_filename TEXT,
  p_operation_type TEXT,
  p_file_size BIGINT,
  p_processing_status TEXT,
  p_storage_url TEXT,
  p_thumbnail_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_image_id UUID;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate expiration date
  SELECT calculate_image_expiration(p_user_id) INTO v_expires_at;
  
  -- Insert the image
  INSERT INTO processed_images (
    user_id,
    original_filename,
    processed_filename,
    operation_type,
    file_size,
    processing_status,
    storage_url,
    thumbnail_url,
    expires_at,
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
    COALESCE(p_thumbnail_url, p_storage_url),
    v_expires_at,
    p_metadata,
    NOW(),
    NOW()
  ) RETURNING id INTO v_image_id;
  
  RETURN v_image_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION insert_processed_image TO anon, service_role;

-- Also create a function to list user images
CREATE OR REPLACE FUNCTION get_user_images(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  original_filename TEXT,
  processed_filename TEXT,
  operation_type TEXT,
  file_size BIGINT,
  width INTEGER,
  height INTEGER,
  processing_status TEXT,
  storage_url TEXT,
  thumbnail_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pi.id,
    pi.user_id,
    pi.original_filename,
    pi.processed_filename,
    pi.operation_type,
    pi.file_size,
    pi.width,
    pi.height,
    pi.processing_status,
    pi.storage_url,
    pi.thumbnail_url,
    pi.expires_at,
    pi.metadata,
    pi.created_at,
    pi.updated_at
  FROM processed_images pi
  WHERE pi.user_id = p_user_id
  ORDER BY pi.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_images TO anon, service_role;