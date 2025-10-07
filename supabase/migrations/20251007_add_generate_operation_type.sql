-- Add 'generate' to the operation_type constraint for AI image generation
-- This fixes the bug where AI-generated images don't appear in "My Images" gallery

-- Drop the old constraint that only allowed: upscale, background-removal, vectorization
ALTER TABLE processed_images
DROP CONSTRAINT IF EXISTS processed_images_operation_type_check;

-- Add new constraint that includes 'generate' for AI image generation
ALTER TABLE processed_images
ADD CONSTRAINT processed_images_operation_type_check
CHECK (operation_type IN ('upscale', 'background-removal', 'vectorization', 'generate'));

-- Verify the new constraint
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'processed_images'::regclass
AND conname LIKE '%operation_type%';
