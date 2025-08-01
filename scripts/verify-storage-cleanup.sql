-- Verify Storage Cleanup Migration

-- 1. Check if expires_at column exists
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'processed_images'
  AND column_name = 'expires_at';

-- 2. Check if functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'calculate_image_expiration',
    'set_image_expiration',
    'cleanup_expired_images',
    'update_image_expirations_on_plan_change'
  )
ORDER BY routine_name;

-- 3. Check if triggers exist
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'on_image_created_set_expiration',
    'on_profile_plan_change_update_expirations'
  );

-- 4. Check images with expiration dates
SELECT 
  COUNT(*) as total_images,
  COUNT(expires_at) as images_with_expiration,
  COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_images,
  COUNT(CASE WHEN expires_at IS NULL THEN 1 END) as permanent_images
FROM public.processed_images;

-- 5. Sample of images with expiration info
SELECT 
  pi.id,
  pi.original_filename,
  pi.created_at,
  pi.expires_at,
  CASE 
    WHEN pi.expires_at IS NULL THEN 'Permanent'
    WHEN pi.expires_at < NOW() THEN 'Expired'
    WHEN pi.expires_at < NOW() + INTERVAL '24 hours' THEN 'Expiring Soon'
    ELSE 'Active'
  END as status,
  p.subscription_plan,
  p.subscription_status
FROM public.processed_images pi
JOIN public.profiles p ON pi.user_id = p.id
LIMIT 10;

-- 6. Test expiration calculation for a free user
SELECT calculate_image_expiration(
  (SELECT id FROM profiles WHERE subscription_plan = 'free' LIMIT 1),
  NOW()
) as test_expiration;