-- Temporarily disable RLS on processed_images to test
ALTER TABLE processed_images DISABLE ROW LEVEL SECURITY;

-- After testing, re-enable with:
-- ALTER TABLE processed_images ENABLE ROW LEVEL SECURITY;