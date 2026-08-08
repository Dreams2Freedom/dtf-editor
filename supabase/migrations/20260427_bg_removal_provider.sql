-- Add provider column to processed_images to distinguish in-house vs ClippingMagic removals

ALTER TABLE processed_images
  ADD COLUMN IF NOT EXISTS provider TEXT;

-- Backfill existing background-removal rows
UPDATE processed_images
   SET provider = 'clippingmagic'
 WHERE operation_type = 'background-removal'
   AND provider IS NULL;

ALTER TABLE processed_images
  ADD CONSTRAINT processed_images_provider_check
  CHECK (
    provider IS NULL OR
    provider IN ('clippingmagic', 'in-house', 'rembg', 'deep-image', 'vectorizer', 'openai')
  );

CREATE INDEX IF NOT EXISTS idx_processed_images_op_provider
  ON processed_images(operation_type, provider);

-- Note: The insert_processed_image RPC is managed in Supabase dashboard.
-- To support the new provider column, either:
--   a) Update the RPC in the Supabase dashboard to accept p_provider TEXT DEFAULT NULL
--      and include it in the INSERT statement, OR
--   b) Use a trigger to copy provider from metadata->>'provider' into the provider column.
-- Option (b) — trigger approach — is used here to avoid modifying the existing RPC signature.

CREATE OR REPLACE FUNCTION sync_provider_from_metadata()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.provider IS NULL AND NEW.metadata IS NOT NULL AND NEW.metadata->>'provider' IS NOT NULL THEN
    NEW.provider := NEW.metadata->>'provider';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_provider ON processed_images;
CREATE TRIGGER trg_sync_provider
  BEFORE INSERT OR UPDATE ON processed_images
  FOR EACH ROW EXECUTE FUNCTION sync_provider_from_metadata();
