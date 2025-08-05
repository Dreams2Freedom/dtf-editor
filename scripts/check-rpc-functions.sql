-- Check if the RPC functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('insert_processed_image', 'get_user_images', 'delete_processed_image')
ORDER BY routine_name;