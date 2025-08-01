-- Fix for missing uploads table
-- Run this in Supabase SQL Editor

-- 1. Create uploads table
CREATE TABLE IF NOT EXISTS public.uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  public_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON public.uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON public.uploads(created_at);

-- 3. Enable RLS
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view their own uploads" ON public.uploads;
  DROP POLICY IF EXISTS "Users can create their own uploads" ON public.uploads;
  DROP POLICY IF EXISTS "Users can update their own uploads" ON public.uploads;
  DROP POLICY IF EXISTS "Users can delete their own uploads" ON public.uploads;
END $$;

CREATE POLICY "Users can view their own uploads" 
  ON public.uploads FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own uploads" 
  ON public.uploads FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own uploads" 
  ON public.uploads FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own uploads" 
  ON public.uploads FOR DELETE 
  USING (auth.uid() = user_id);

-- 5. Create update trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_uploads_updated_at ON public.uploads;
CREATE TRIGGER update_uploads_updated_at
  BEFORE UPDATE ON public.uploads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 6. Verify table was created
SELECT 
  'Table created successfully' as status,
  count(*) as row_count 
FROM public.uploads;