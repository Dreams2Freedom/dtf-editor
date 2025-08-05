-- Check current image URLs to see if they're signed URLs or paths
SELECT 
  id,
  processed_filename,
  storage_url,
  LENGTH(storage_url) as url_length,
  CASE 
    WHEN storage_url LIKE '%token=%' THEN 'signed_url'
    WHEN storage_url LIKE 'data:%' THEN 'data_url'
    WHEN storage_url LIKE '%/storage/v1/object/public/%' THEN 'public_url'
    ELSE 'unknown'
  END as url_type,
  created_at
FROM processed_images
ORDER BY created_at DESC
LIMIT 10;

-- Update the RPC function to return storage paths from metadata
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
) 
SECURITY DEFINER
SET search_path = public
AS $$
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
    -- Use storage path from metadata if available, otherwise use stored URL
    COALESCE(
      pi.metadata->>'storage_path',
      pi.storage_url
    ) as storage_url,
    COALESCE(
      pi.metadata->>'storage_path',
      pi.thumbnail_url
    ) as thumbnail_url,
    pi.metadata,
    pi.created_at,
    pi.updated_at
  FROM processed_images pi
  WHERE pi.user_id = p_user_id
  ORDER BY pi.created_at DESC;
END;
$$ LANGUAGE plpgsql;