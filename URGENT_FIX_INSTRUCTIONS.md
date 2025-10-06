# URGENT: Upload System Fix Instructions

## The Problem

The `/process` page is using a new upload flow that requires the `uploads` database table, which doesn't exist in your Supabase instance. This is causing the 500 error when trying to upload images.

## Immediate Fix (Choose ONE option):

### Option 1: Create the Missing Table (RECOMMENDED)

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste this SQL:

```sql
-- Create uploads table for storing user upload records
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON public.uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON public.uploads(created_at);

-- Enable RLS
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Create update trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_uploads_updated_at
  BEFORE UPDATE ON public.uploads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

4. Click "Run"
5. The upload system should now work properly

### Option 2: Revert to Original Upload Flow

If you can't create the table right now, I can modify the code to use the original working flow that doesn't require the uploads table. This would bypass the database and work immediately.

## What Happened

1. A new `/process` page was created that uses a different upload flow
2. This new flow uploads to `/api/upload` which tries to save records to an `uploads` table
3. The `uploads` table doesn't exist because migrations weren't fully applied
4. The original `ImageProcessor` component used `/api/process` directly without needing the table

## Missing Tables Status

- ✅ profiles - EXISTS
- ❌ uploads - MISSING (causing the current error)
- ❌ subscription_plans - MISSING
- ❌ processing_history - MISSING
- ❌ Other tables from migrations

## Recommendation

Run the SQL above to create the uploads table. This will fix the immediate issue and allow the new upload flow to work as designed.
