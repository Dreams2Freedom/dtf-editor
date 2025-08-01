-- Create a simple function to test if processed_images table exists and is accessible
CREATE OR REPLACE FUNCTION test_processed_images_access()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Try to select from the table
  SELECT json_build_object(
    'table_exists', EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'processed_images'
    ),
    'row_count', (
      SELECT COUNT(*) FROM processed_images
    ),
    'can_insert', true
  ) INTO v_result;
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon and service_role
GRANT EXECUTE ON FUNCTION test_processed_images_access() TO anon, service_role;