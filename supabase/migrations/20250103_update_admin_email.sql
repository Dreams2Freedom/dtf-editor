-- Update the is_admin function with the correct admin email

CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user email is in admin list
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = user_id
    AND (
      email IN (
        'shannon@s2transfers.com',  -- Primary admin email
        'shannonherod@gmail.com',    -- Secondary admin email
        'admin@dtfeditor.com'        -- Generic admin email
      )
      -- Also check for admin role in metadata
      OR raw_user_meta_data->>'role' = 'admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function with your current user
DO $$
DECLARE
  current_user_email TEXT;
  is_user_admin BOOLEAN;
BEGIN
  -- Get current user's email
  SELECT email INTO current_user_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Check if current user is admin
  is_user_admin := is_admin(auth.uid());

  RAISE NOTICE 'Current user: %', COALESCE(current_user_email, 'Not found');
  RAISE NOTICE 'Is admin: %', is_user_admin;

  -- Also show all admin emails
  RAISE NOTICE '';
  RAISE NOTICE 'Admin emails configured:';
  RAISE NOTICE '  - shannon@s2transfers.com';
  RAISE NOTICE '  - shannonherod@gmail.com';
  RAISE NOTICE '  - admin@dtfeditor.com';
END $$;