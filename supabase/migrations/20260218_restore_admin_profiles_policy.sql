-- Restore admin SELECT policy on profiles table
-- Migration 004 dropped the "Enable admin access" policy on profiles
-- but never recreated it. This means admins cannot read other users'
-- profiles, causing "Unknown" to appear on support tickets and other
-- admin pages that need to look up user info.

-- Only add if it doesn't already exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
    AND policyname = 'profiles_admin_select'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "profiles_admin_select" ON profiles
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM profiles admin_profile
            WHERE admin_profile.id = auth.uid()
            AND admin_profile.is_admin = true
          )
        )
    $policy$;
  END IF;
END $$;
