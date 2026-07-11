-- Widen processed_images.operation_type to allow Studio's client-side tools
-- (color-change was already present; add halftone) so composites are tagged
-- correctly instead of falling back to 'background-removal'.
--
-- Additive only — widening a CHECK constraint never invalidates existing rows.
-- Applied to production 2026-07-09.

ALTER TABLE processed_images
  DROP CONSTRAINT IF EXISTS processed_images_operation_type_check;

ALTER TABLE processed_images
  ADD CONSTRAINT processed_images_operation_type_check
  CHECK (operation_type IN (
    'upscale',
    'background-removal',
    'vectorization',
    'generate',
    'color-change',
    'halftone'
  ));
