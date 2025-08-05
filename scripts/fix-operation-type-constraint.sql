-- Check the current constraint on operation_type
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'processed_images'::regclass
AND conname LIKE '%operation_type%';

-- Drop the old constraint
ALTER TABLE processed_images 
DROP CONSTRAINT IF EXISTS processed_images_operation_type_check;

-- Add new constraint that includes 'vectorization'
ALTER TABLE processed_images 
ADD CONSTRAINT processed_images_operation_type_check 
CHECK (operation_type IN ('upscale', 'background-removal', 'vectorization'));

-- Verify the new constraint
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'processed_images'::regclass
AND conname LIKE '%operation_type%';

-- Now check if we can insert a test vectorization record
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
    (SELECT id FROM auth.users LIMIT 1),  -- Use first user for test
    'test_constraint.svg',
    'vectorization_test.svg',
    'vectorization',
    100,
    'completed',
    'test/path.svg',
    'test/path.svg',
    '{"test": true}'::jsonb,
    NOW(),
    NOW()
) RETURNING id;

-- Clean up test record
DELETE FROM processed_images 
WHERE original_filename = 'test_constraint.svg';