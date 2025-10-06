-- Create Storage Buckets for AI Preview System
-- Two separate buckets for security: originals (private) and watermarked (public)

-- 1. Create bucket for original unwatermarked previews (PRIVATE - service role only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-preview-originals',
  'ai-preview-originals',
  false, -- PRIVATE - not publicly accessible
  10485760, -- 10MB limit (low-quality previews are small)
  ARRAY['image/png', 'image/jpeg', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- 2. Create bucket for watermarked previews (PUBLIC with user-scoped access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-preview-watermarked',
  'ai-preview-watermarked',
  true, -- PUBLIC - users can access their own watermarked previews
  10485760, -- 10MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RLS POLICIES FOR ai-preview-originals (PRIVATE)
-- ============================================================================

-- Policy 1: Only service role can insert originals
CREATE POLICY "Service role can insert original previews"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (
  bucket_id = 'ai-preview-originals'
);

-- Policy 2: Only service role can read originals (users should NEVER access unwatermarked)
CREATE POLICY "Service role can read original previews"
ON storage.objects
FOR SELECT
TO service_role
USING (
  bucket_id = 'ai-preview-originals'
);

-- Policy 3: Only service role can delete originals
CREATE POLICY "Service role can delete original previews"
ON storage.objects
FOR DELETE
TO service_role
USING (
  bucket_id = 'ai-preview-originals'
);

-- ============================================================================
-- RLS POLICIES FOR ai-preview-watermarked (PUBLIC with user restrictions)
-- ============================================================================

-- Policy 1: Service role can insert watermarked previews
CREATE POLICY "Service role can insert watermarked previews"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (
  bucket_id = 'ai-preview-watermarked'
);

-- Policy 2: Users can read their own watermarked previews (path-based security)
-- Path format: ai-preview-watermarked/{user_id}/{preview_id}.png
CREATE POLICY "Users can read their own watermarked previews"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ai-preview-watermarked'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Service role can read all watermarked previews
CREATE POLICY "Service role can read all watermarked previews"
ON storage.objects
FOR SELECT
TO service_role
USING (
  bucket_id = 'ai-preview-watermarked'
);

-- Policy 4: Service role can delete watermarked previews (for cleanup)
CREATE POLICY "Service role can delete watermarked previews"
ON storage.objects
FOR DELETE
TO service_role
USING (
  bucket_id = 'ai-preview-watermarked'
);

-- Policy 5: Users can delete their own watermarked previews
CREATE POLICY "Users can delete their own watermarked previews"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ai-preview-watermarked'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Add comments for documentation
COMMENT ON POLICY "Service role can insert original previews" ON storage.objects
IS 'Allows service role to upload unwatermarked originals for later upscaling';

COMMENT ON POLICY "Users can read their own watermarked previews" ON storage.objects
IS 'Users can only see their own watermarked previews, never the unwatermarked originals';

COMMENT ON POLICY "Service role can delete watermarked previews" ON storage.objects
IS 'Cleanup job can delete expired previews to manage storage costs';
