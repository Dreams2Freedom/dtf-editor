-- First, find ALL versions of calculate_image_expiration
SELECT 
    proname as function_name,
    proargtypes::regtype[] as argument_types,
    prosrc as source_code
FROM pg_proc
WHERE proname = 'calculate_image_expiration';

-- Drop ALL versions of calculate_image_expiration
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT 'DROP FUNCTION IF EXISTS ' || oid::regprocedure || ' CASCADE;' as drop_cmd
        FROM pg_proc 
        WHERE proname = 'calculate_image_expiration'
    LOOP
        EXECUTE r.drop_cmd;
    END LOOP;
END $$;

-- Now check what insert_processed_image expects
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'insert_processed_image' 
LIMIT 1;

-- Recreate insert_processed_image without any expiration logic
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
  -- Simple insert without any expiration calculation
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

-- Test the cleaned function
SELECT insert_processed_image(
    'f689bb22-89dd-4c3c-a941-d77feb84428d'::uuid,
    'test_clean.png',
    'test_clean_processed.png',
    'upscale',
    1024,
    'completed',
    'https://via.placeholder.com/150',
    'https://via.placeholder.com/150',
    '{"test": true, "clean": true}'::jsonb
);

-- Verify it was inserted
SELECT id, original_filename, created_at 
FROM processed_images 
WHERE user_id = 'f689bb22-89dd-4c3c-a941-d77feb84428d'
ORDER BY created_at DESC 
LIMIT 5;