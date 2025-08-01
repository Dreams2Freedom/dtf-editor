-- DTF Editor - Fix Remaining Policies
-- Migration: 005_fix_remaining_policies.sql
-- Description: Drops the images_user_own policy that was already created and completes the auth fix
-- Date: January 2025

-- Drop the existing policy that's causing the error
DROP POLICY IF EXISTS "images_user_own" ON images;

-- Now create it fresh
CREATE POLICY "images_user_own" ON images
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Also ensure the profiles policies are set correctly
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;

-- Recreate profiles policies
CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "profiles_delete_own" ON profiles
    FOR DELETE
    USING (auth.uid() = id);

-- Test that policies are working
SELECT COUNT(*) as policy_count FROM pg_policies WHERE tablename = 'profiles';
SELECT COUNT(*) as policy_count FROM pg_policies WHERE tablename = 'images';