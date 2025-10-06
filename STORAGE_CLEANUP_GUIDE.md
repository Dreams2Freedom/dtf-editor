# Storage Cleanup Implementation Guide

This guide explains how to implement the 48-hour image deletion for free users.

## What This Does

The storage cleanup system automatically:

1. **Deletes images after 48 hours** for free users
2. **Keeps images for 90 days** for pay-as-you-go users (from last credit purchase)
3. **Keeps images permanently** for subscribed users
4. **Updates expiration dates** when users upgrade/downgrade

## Implementation Steps

### Step 1: Apply the Database Migration

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the contents of `/supabase/migrations/012_create_storage_cleanup.sql`
5. Paste and run the query

This migration:

- Adds `expires_at` column to `processed_images`
- Creates functions to calculate expiration dates
- Sets up triggers to auto-calculate expiration on image creation
- Updates expiration when user plan changes

### Step 2: Deploy the Edge Function (Optional)

If you want to use Supabase Edge Functions for cleanup:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Deploy the edge function
supabase functions deploy cleanup-free-user-images
```

### Step 3: Set Up Scheduled Cleanup

You have three options for running the cleanup:

#### Option A: Supabase Cron (Recommended)

In Supabase Dashboard → Database → Extensions:

1. Enable the `pg_cron` extension
2. Run this SQL to schedule hourly cleanup:

```sql
SELECT cron.schedule(
  'cleanup-expired-images',
  '0 * * * *', -- Every hour
  'SELECT cleanup_expired_images();'
);
```

#### Option B: External Cron Service

Use a service like GitHub Actions, Vercel Cron, or Upstash to call the Edge Function:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/cleanup-free-user-images \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

#### Option C: Manual Cleanup

Run this SQL periodically:

```sql
SELECT cleanup_expired_images();
```

## How It Works

### Expiration Logic

- **Free users**: Images expire 48 hours after upload
- **Pay-as-you-go**: Images expire 90 days after last credit purchase
- **Subscribers**: Images never expire

### What Happens on Expiration

1. Database record is deleted
2. Storage files are removed (if using Edge Function)
3. Thumbnails are cleaned up
4. Collection associations are removed automatically (CASCADE)

### Plan Change Behavior

When a user changes plans:

- Free → Paid: All expiration dates removed (images become permanent)
- Paid → Free: Images get 48-hour expiration from current time
- Credit purchase: Extends all images to 90 days from purchase date

## Testing the System

Run the test script to verify everything is working:

```bash
node scripts/test-storage-cleanup.js
```

This will show:

- Images with expiration dates
- Already expired images
- User storage patterns
- Test the cleanup function

## UI Updates

The gallery now shows:

- "Expires in X hours" for images expiring within 24 hours
- "Expires [date]" for images expiring later
- "Expired" for images past expiration
- Red text color for expiration warnings

## Monitoring

To monitor the cleanup system:

```sql
-- Check images by expiration status
SELECT
  CASE
    WHEN expires_at IS NULL THEN 'Permanent'
    WHEN expires_at < NOW() THEN 'Expired'
    WHEN expires_at < NOW() + INTERVAL '24 hours' THEN 'Expiring Soon'
    ELSE 'Active'
  END as status,
  COUNT(*) as count
FROM processed_images
GROUP BY status;

-- Check cleanup job history (if using pg_cron)
SELECT * FROM cron.job_run_details
WHERE jobname = 'cleanup-expired-images'
ORDER BY start_time DESC
LIMIT 10;
```

## Troubleshooting

### Images not getting expiration dates

- Check if the trigger is active: `\d processed_images`
- Manually run: `UPDATE processed_images SET expires_at = calculate_image_expiration(user_id, created_at) WHERE expires_at IS NULL`

### Cleanup not running

- Check cron job status
- Verify Edge Function deployment
- Check Supabase logs for errors

### Storage not being deleted

- Ensure service role key has storage access
- Check storage bucket RLS policies
- Verify storage paths are correct
