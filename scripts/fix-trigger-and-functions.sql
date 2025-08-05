-- Find the trigger that's calling calculate_image_expiration
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgfoid IN (
    SELECT oid FROM pg_proc WHERE proname = 'set_image_expiration'
);

-- Drop the trigger
DROP TRIGGER IF EXISTS set_image_expiration_trigger ON processed_images;

-- Drop the trigger function
DROP FUNCTION IF EXISTS set_image_expiration();

-- Drop all versions of calculate_image_expiration
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

-- Now the insert should work - test it
SELECT insert_processed_image(
    'f689bb22-89dd-4c3c-a941-d77feb84428d'::uuid,
    'test_no_trigger.png',
    'test_no_trigger_processed.png',
    'upscale',
    1024,
    'completed',
    'https://via.placeholder.com/150',
    'https://via.placeholder.com/150',
    '{"test": true, "no_trigger": true}'::jsonb
);

-- Verify it worked
SELECT id, original_filename, created_at, expires_at
FROM processed_images 
WHERE user_id = 'f689bb22-89dd-4c3c-a941-d77feb84428d'
ORDER BY created_at DESC 
LIMIT 5;