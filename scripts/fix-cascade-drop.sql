-- Drop the trigger first
DROP TRIGGER IF EXISTS on_image_created_set_expiration ON processed_images;

-- Drop the trigger function with CASCADE
DROP FUNCTION IF EXISTS set_image_expiration() CASCADE;

-- Drop all versions of calculate_image_expiration with CASCADE
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

-- Now test the insert - should work!
SELECT insert_processed_image(
    'f689bb22-89dd-4c3c-a941-d77feb84428d'::uuid,
    'test_finally_works.png',
    'test_finally_works_processed.png',
    'upscale',
    1024,
    'completed',
    'https://via.placeholder.com/150',
    'https://via.placeholder.com/150',
    '{"test": true, "finally": "works!"}'::jsonb
) as new_image_id;

-- Verify it worked
SELECT id, original_filename, created_at, processing_status
FROM processed_images 
WHERE user_id = 'f689bb22-89dd-4c3c-a941-d77feb84428d'
ORDER BY created_at DESC 
LIMIT 5;