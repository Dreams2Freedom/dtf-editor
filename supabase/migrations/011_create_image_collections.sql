-- Create image collections table
CREATE TABLE IF NOT EXISTS public.image_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  
  -- Ensure unique collection names per user
  CONSTRAINT unique_collection_name_per_user UNIQUE(user_id, name)
);

-- Create collection items junction table
CREATE TABLE IF NOT EXISTS public.collection_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID REFERENCES public.image_collections(id) ON DELETE CASCADE NOT NULL,
  image_id UUID REFERENCES public.processed_images(id) ON DELETE CASCADE NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  
  -- Ensure an image can only be in a collection once
  CONSTRAINT unique_image_per_collection UNIQUE(collection_id, image_id)
);

-- Add collection_id to processed_images for default collection
ALTER TABLE public.processed_images 
ADD COLUMN IF NOT EXISTS primary_collection_id UUID REFERENCES public.image_collections(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_image_collections_user_id ON public.image_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON public.collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_image_id ON public.collection_items(image_id);
CREATE INDEX IF NOT EXISTS idx_processed_images_primary_collection ON public.processed_images(primary_collection_id);

-- Enable RLS
ALTER TABLE public.image_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for image_collections
CREATE POLICY "Users can view own collections" ON public.image_collections
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own collections" ON public.image_collections
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections" ON public.image_collections
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections" ON public.image_collections
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for collection_items
CREATE POLICY "Users can view own collection items" ON public.collection_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.image_collections 
      WHERE id = collection_items.collection_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add to own collections" ON public.collection_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.image_collections 
      WHERE id = collection_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove from own collections" ON public.collection_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.image_collections 
      WHERE id = collection_items.collection_id 
      AND user_id = auth.uid()
    )
  );

-- Function to create default collection for new users
CREATE OR REPLACE FUNCTION create_default_collection()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.image_collections (user_id, name, description, is_default)
  VALUES (NEW.id, 'All Images', 'Default collection for all your images', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default collection when user signs up
CREATE TRIGGER on_auth_user_created_create_collection
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_collection();

-- Create default collections for existing users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM auth.users
  LOOP
    -- Check if user already has a default collection
    IF NOT EXISTS (
      SELECT 1 FROM public.image_collections 
      WHERE user_id = user_record.id AND is_default = true
    ) THEN
      INSERT INTO public.image_collections (user_id, name, description, is_default)
      VALUES (user_record.id, 'All Images', 'Default collection for all your images', true);
    END IF;
  END LOOP;
END;
$$;