-- Drop existing functions first
DROP FUNCTION IF EXISTS insert_processed_image(uuid,text,text,text,bigint,text,text,text,jsonb);
DROP FUNCTION IF EXISTS get_user_images(uuid);
DROP FUNCTION IF EXISTS delete_processed_image(uuid,uuid);

-- Recreate the functions
-- Function to insert processed images
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

-- Function to get user images
CREATE OR REPLACE FUNCTION get_user_images(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  original_filename TEXT,
  processed_filename TEXT,
  operation_type TEXT,
  file_size BIGINT,
  processing_status TEXT,
  storage_url TEXT,
  thumbnail_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
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
    pi.processing_status,
    pi.storage_url,
    pi.thumbnail_url,
    pi.metadata,
    pi.created_at,
    pi.updated_at
  FROM processed_images pi
  WHERE pi.user_id = p_user_id
  ORDER BY pi.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete processed image
CREATE OR REPLACE FUNCTION delete_processed_image(p_image_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_deleted BOOLEAN;
BEGIN
  DELETE FROM processed_images
  WHERE id = p_image_id AND user_id = p_user_id;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT > 0;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION insert_processed_image TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_images TO authenticated;
GRANT EXECUTE ON FUNCTION delete_processed_image TO authenticated;

-- Test that functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('insert_processed_image', 'get_user_images', 'delete_processed_image')
ORDER BY routine_name;