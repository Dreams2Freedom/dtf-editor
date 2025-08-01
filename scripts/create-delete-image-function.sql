-- Create a function to delete user's own images
CREATE OR REPLACE FUNCTION delete_processed_image(
  p_image_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_deleted BOOLEAN;
BEGIN
  -- Delete the image only if it belongs to the user
  DELETE FROM processed_images
  WHERE id = p_image_id AND user_id = p_user_id;
  
  -- Check if a row was deleted
  GET DIAGNOSTICS v_deleted = ROW_COUNT > 0;
  
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_processed_image TO anon, service_role;