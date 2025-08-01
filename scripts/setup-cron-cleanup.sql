-- Setup pg_cron for automatic image cleanup
-- Run this in Supabase SQL Editor

-- Step 1: Enable pg_cron extension
-- Note: You may need to enable this in Supabase Dashboard > Database > Extensions first
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Step 3: Schedule the cleanup job to run every hour
SELECT cron.schedule(
  'cleanup-expired-images',           -- Job name
  '0 * * * *',                       -- Cron expression: every hour at minute 0
  $$SELECT cleanup_expired_images()$$ -- SQL command to execute
);

-- Step 4: Verify the job was created
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job
WHERE jobname = 'cleanup-expired-images';

-- Optional: View recent job runs (will be empty until first run)
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-expired-images')
ORDER BY start_time DESC
LIMIT 5;

-- Useful commands for managing the cron job:

-- To disable the job temporarily:
-- SELECT cron.unschedule('cleanup-expired-images');

-- To update the schedule (e.g., to run every 30 minutes):
-- UPDATE cron.job 
-- SET schedule = '*/30 * * * *' 
-- WHERE jobname = 'cleanup-expired-images';

-- To manually run the cleanup immediately:
-- SELECT cleanup_expired_images();

-- To see all scheduled jobs:
-- SELECT * FROM cron.job;