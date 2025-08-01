# Image Collections Migration Guide

This guide explains how to apply the collections migration to enable the collections feature in the image gallery.

## What This Migration Does

The migration creates:
1. **`image_collections` table** - Stores user-created collections
2. **`collection_items` table** - Links images to collections (many-to-many)
3. **RLS policies** - Ensures users can only see/modify their own collections
4. **Default collection** - Creates an "All Images" collection for each user
5. **Indexes** - For performance optimization

## How to Apply the Migration

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New query**
5. Copy the entire contents of `/supabase/migrations/011_create_image_collections.sql`
6. Paste it into the query editor
7. Click **Run** (or press Ctrl/Cmd + Enter)

You should see a success message. The migration is now applied!

### Option 2: Via Supabase CLI (If Installed)

```bash
supabase db push
```

## Verify the Migration

After applying the migration, verify it worked:

1. In Supabase Dashboard, go to **Table Editor**
2. You should see two new tables:
   - `image_collections`
   - `collection_items`
3. The `processed_images` table should have a new column: `primary_collection_id`

## Enable Collections in the App

Once the migration is applied, you need to enable the collections feature in the code:

1. Open `/src/components/image/ImageGalleryEnhanced.tsx`
2. Uncomment the following:
   - Line ~83: `fetchCollections();` 
   - The collections dropdown in the filter menu (around line 540-555)
   - Add `selectedCollection` back to the useEffect dependency array

## What Happens Next

After the migration:
- All existing users will automatically get a default "All Images" collection
- New users will get this collection when they sign up
- Users can create custom collections to organize their images
- Images can belong to multiple collections

## Troubleshooting

If you encounter errors:
1. Make sure you're using the service role key (not anon key) if running scripts
2. Check that RLS is enabled on the new tables
3. Verify the auth.users table exists (it should if you have users)

## Rolling Back

If needed, you can roll back with:

```sql
DROP TABLE IF EXISTS public.collection_items CASCADE;
DROP TABLE IF EXISTS public.image_collections CASCADE;
ALTER TABLE public.processed_images DROP COLUMN IF EXISTS primary_collection_id;
DROP FUNCTION IF EXISTS create_default_collection() CASCADE;
```

But be aware this will delete all collections data!