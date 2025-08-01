-- Enable RLS and Fix Storage Policies for DTF Editor
-- Run this entire script in Supabase SQL Editor

-- 1. First, enable RLS on storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Check that RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 3. Drop ALL existing policies to start fresh
DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- 4. Create new policies for each bucket

-- IMAGES BUCKET POLICIES
CREATE POLICY "Allow users to upload images to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'images' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow users to view own images"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'images' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow users to update own images"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'images' AND 
    (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'images' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow users to delete own images"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'images' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- USER-IMAGES BUCKET POLICIES
CREATE POLICY "Allow users to manage user-images in own folder"
ON storage.objects FOR ALL TO authenticated
USING (
    bucket_id = 'user-images' AND 
    (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'user-images' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- USER-UPLOADS BUCKET POLICIES
CREATE POLICY "Allow users to upload to user-uploads own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'user-uploads' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow users to view user-uploads own folder"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'user-uploads' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Allow users to delete user-uploads own folder"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'user-uploads' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Verify policies were created
SELECT 
    policyname,
    cmd,
    roles,
    CASE 
        WHEN qual LIKE '%images%' AND qual NOT LIKE '%user-%' THEN 'images'
        WHEN qual LIKE '%user-images%' THEN 'user-images'
        WHEN qual LIKE '%user-uploads%' THEN 'user-uploads'
        ELSE 'unknown'
    END as bucket
FROM pg_policies 
WHERE schemaname = 'storage' 
    AND tablename = 'objects'
ORDER BY bucket, policyname;

-- 6. Final check - ensure no public access
SELECT id, name, public 
FROM storage.buckets 
ORDER BY name;