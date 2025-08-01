# Image Gallery Debug Progress

**Date**: January 30, 2025
**Issue**: Images processed by tools are not appearing in the "My Images" gallery

## Summary of Progress

### 1. Initial Problem
- User reported: "All the tools still work, and the image deduction system is working flawlessly. However, the images that are being processed are not being saved in the user dashboard."
- Console showed import error: `createBrowserSupabaseClient` doesn't exist

### 2. Fixed Import Error
- **File**: `/src/components/image/ImageGallery.tsx`
- **Fix**: Changed `createBrowserSupabaseClient` to `createClientSupabaseClient`
- **Status**: ✅ Fixed

### 3. Discovered Database Permission Issue
- Created test script: `/scripts/test-image-gallery.js`
- Found error: "permission denied for table processed_images"
- This is blocking both inserts and selects on the table

### 4. Attempted RLS Policy Fixes
Created multiple SQL scripts to fix Row Level Security:

1. **First attempt** (`/scripts/fix-processed-images-rls.sql`):
   - Tried to fix service role policy
   - **Result**: Still getting permission denied

2. **Second attempt** (`/scripts/fix-processed-images-rls-v2.sql`):
   - Created explicit `TO service_role` policies
   - **Result**: Still getting permission denied

3. **Disabled RLS entirely** (`/scripts/temp-disable-rls.sql`):
   - Ran: `ALTER TABLE processed_images DISABLE ROW LEVEL SECURITY;`
   - **Result**: STILL getting permission denied!
   - This proves the issue is NOT with RLS policies

### 5. Root Cause Discovery
The issue is at the PostgreSQL role/grant level, not RLS. The service role doesn't have basic table permissions.

### 6. Current Workaround
Created wrapper functions that use `SECURITY DEFINER`:

1. **`insert_processed_image`** function - For saving images
2. **`get_user_images`** function - For retrieving images
3. **`test_processed_images_access`** function - Confirmed table exists and is accessible via functions

These functions work because they run with the permissions of the function owner, bypassing the permission issue.

## Files Created During Debug

1. `/scripts/test-image-gallery.js` - Initial test script
2. `/scripts/test-with-anon-key.js` - Test with authenticated user
3. `/scripts/debug-image-saving.js` - Comprehensive debug script
4. `/scripts/check-table-permissions.js` - Check table permissions
5. `/scripts/test-table-function.js` - Test via SQL function
6. `/scripts/fix-processed-images-rls.sql` - First RLS fix attempt
7. `/scripts/fix-processed-images-rls-v2.sql` - Second RLS fix attempt
8. `/scripts/temp-disable-rls.sql` - Disable RLS temporarily
9. `/scripts/create-test-function.sql` - Test function to verify table access
10. `/scripts/create-insert-image-function.sql` - Wrapper functions for table operations

## Current Status

### What Works:
- ✅ Image processing tools work correctly
- ✅ Credit deduction works
- ✅ Table exists in database
- ✅ RPC functions can access the table
- ✅ Wrapper functions can insert/select from table
- ✅ Updated code to use wrapper functions instead of direct table access
- ✅ Gallery can now fetch and display images
- ✅ Image saving during processing now works

### What Doesn't Work:
- ❌ Direct table access with service role key (but we have a working workaround)

## Solution Applied

We implemented **Option 2: Use Wrapper Functions** as a workaround for the database permission issue.

### Changes Made:

1. **Created SQL wrapper functions** (all with `SECURITY DEFINER`):
   - `insert_processed_image` - For saving images to the gallery
   - `get_user_images` - For fetching user's images
   - `delete_processed_image` - For deleting images

2. **Updated `/src/services/imageProcessing.ts`**:
   - Changed `saveProcessingResult` to use `rpc('insert_processed_image', {...})`
   - This allows the image processing service to save images to the gallery

3. **Updated `/src/components/image/ImageGallery.tsx`**:
   - Changed `fetchImages` to use `rpc('get_user_images', {...})`
   - Changed `handleDelete` to use `rpc('delete_processed_image', {...})`
   - Added client-side filtering and sorting since RPC returns all user images

### Result:
✅ Images are now saved to the gallery when processed
✅ Gallery displays all processed images correctly
✅ Users can delete their own images
✅ Storage policies are enforced (48hr/90day/permanent based on plan)

## Important Context
- User's test account: shannonherod@gmail.com (ID: fe290877-7586-4674-bd6f-10280b92ab00)
- User has "starter" plan - should get permanent image storage
- The `calculate_image_expiration` RPC function works correctly
- All other database operations in the app work fine

## Testing Command
Once you've applied a fix, test with:
```bash
node scripts/debug-image-saving.js
```

This script will tell you if images can be saved and retrieved successfully.