require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createUploadsTable() {
  try {
    // Create the uploads table
    const { error: createError } = await supabase
      .from('uploads')
      .select('*')
      .limit(1);

    if (createError && createError.code === '42P01') {
      console.log(
        'Uploads table does not exist. Please create it manually in Supabase dashboard.'
      );
      console.log(
        'Use the SQL from: supabase/migrations/007_create_uploads_table.sql'
      );

      // Show the SQL that needs to be run
      console.log('\nSQL to run in Supabase SQL Editor:\n');
      console.log(`-- Create uploads table for storing user upload records
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
  USING (auth.uid() = user_id);`);
    } else if (!createError) {
      console.log('✓ Uploads table already exists');
    } else {
      console.error('Error checking uploads table:', createError);
    }

    // Check if bucket exists
    const { data: buckets, error: bucketError } =
      await supabase.storage.listBuckets();

    if (!bucketError) {
      const bucketExists = buckets?.some(b => b.name === 'user-uploads');
      if (bucketExists) {
        console.log('✓ Storage bucket "user-uploads" exists');
      } else {
        console.log('⚠️  Storage bucket "user-uploads" does not exist');
        console.log(
          'Please create it in Supabase dashboard with public access'
        );
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

createUploadsTable();
