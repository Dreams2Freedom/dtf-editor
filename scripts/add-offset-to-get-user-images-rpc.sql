-- Update RPC function to support pagination with offset
DROP FUNCTION IF EXISTS get_user_images(uuid);
DROP FUNCTION IF EXISTS get_user_images(uuid, integer, integer);

CREATE OR REPLACE FUNCTION get_user_images(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 1000,
  p_offset INTEGER DEFAULT 0
)
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
  ORDER BY pi.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_images TO authenticated;

-- Test the function
-- SELECT * FROM get_user_images('YOUR_USER_ID', 8, 0);
