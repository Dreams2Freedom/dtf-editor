-- DTF Editor - Consolidated Auth Fix (Version 2)
-- Migration: 004_consolidated_auth_fix_v2.sql
-- Description: Fixes auth issues without PostgreSQL version compatibility problems
-- Date: January 2025

-- =============================================================================
-- STEP 1: DROP ALL EXISTING POLICIES TO START FRESH
-- =============================================================================

-- Drop all policies on profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read/write for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for new users" ON profiles;
DROP POLICY IF EXISTS "Enable admin access" ON profiles;
DROP POLICY IF EXISTS "Enable admin access to profiles" ON profiles;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Allow read/update/delete for authenticated users" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_all_operations" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;

-- Drop policies on other tables
DROP POLICY IF EXISTS "Users can view own images" ON images;
DROP POLICY IF EXISTS "Users can insert own images" ON images;
DROP POLICY IF EXISTS "Users can update own images" ON images;
DROP POLICY IF EXISTS "Users can delete own images" ON images;
DROP POLICY IF EXISTS "Admins can view all images" ON images;
DROP POLICY IF EXISTS "Enable admin access to images" ON images;
DROP POLICY IF EXISTS "images_user_all" ON images;
DROP POLICY IF EXISTS "images_admin_all" ON images;
DROP POLICY IF EXISTS "images_select" ON images;
DROP POLICY IF EXISTS "images_insert" ON images;
DROP POLICY IF EXISTS "images_update" ON images;
DROP POLICY IF EXISTS "images_delete" ON images;

DROP POLICY IF EXISTS "Users can view own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "System can insert transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Enable admin access to transactions" ON credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_user_select" ON credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_system_insert" ON credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_admin_all" ON credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_select" ON credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_insert" ON credit_transactions;

-- =============================================================================
-- STEP 2: FIX COLUMN NAMING CONSISTENCY
-- =============================================================================

-- Ensure we have consistent column naming for credits
DO $$ 
BEGIN
    -- Check if credits_remaining column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'credits_remaining'
    ) THEN
        -- Column exists, we're good
        NULL;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'credits'
    ) THEN
        -- Rename credits to credits_remaining
        ALTER TABLE profiles RENAME COLUMN credits TO credits_remaining;
    ELSE
        -- Add the column if neither exists
        ALTER TABLE profiles ADD COLUMN credits_remaining INTEGER DEFAULT 2;
    END IF;
END $$;

-- =============================================================================
-- STEP 3: CREATE TRIGGER FOR AUTOMATIC PROFILE CREATION
-- =============================================================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        first_name,
        last_name,
        company,
        credits_remaining,
        subscription_status,
        subscription_plan,
        is_admin,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'firstName', NEW.raw_user_meta_data->>'first_name'),
        COALESCE(NEW.raw_user_meta_data->>'lastName', NEW.raw_user_meta_data->>'last_name'),
        NEW.raw_user_meta_data->>'company',
        2, -- Free tier credits
        'free',
        'free',
        false,
        NOW(),
        NOW()
    );
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Don't fail the signup if profile creation fails
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- STEP 4: ENABLE RLS AND CREATE SIMPLE POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Check if other tables exist before enabling RLS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'image_operations') THEN
        ALTER TABLE image_operations ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'image_collections') THEN
        ALTER TABLE image_collections ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'image_collection_items') THEN
        ALTER TABLE image_collection_items ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- =============================================================================
-- PROFILES TABLE POLICIES (NON-RECURSIVE)
-- =============================================================================

-- Allow users to insert their own profile during signup
CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Allow users to view their own profile
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- Allow users to delete their own profile
CREATE POLICY "profiles_delete_own" ON profiles
    FOR DELETE
    USING (auth.uid() = id);

-- =============================================================================
-- IMAGES TABLE POLICIES
-- =============================================================================

-- Users can do everything with their own images
CREATE POLICY "images_user_own" ON images
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- CREDIT TRANSACTIONS POLICIES
-- =============================================================================

-- Users can view their own transactions
CREATE POLICY "credit_transactions_user_select" ON credit_transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- System/service can insert transactions (using service role key)
CREATE POLICY "credit_transactions_system_insert" ON credit_transactions
    FOR INSERT
    WITH CHECK (true); -- This will be restricted by using service role key

-- =============================================================================
-- STEP 5: CREATE PROFILES FOR EXISTING USERS
-- =============================================================================

-- Create profiles for any existing auth.users that don't have one
INSERT INTO profiles (
    id, 
    email, 
    credits_remaining, 
    subscription_status, 
    subscription_plan,
    is_admin,
    created_at,
    updated_at
)
SELECT 
    au.id,
    au.email,
    2, -- Free tier credits
    'free',
    'free',
    false,
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- =============================================================================
-- STEP 6: SIMPLE VERIFICATION (NO VERSION-SPECIFIC QUERIES)
-- =============================================================================

-- Count policies to verify they were created
SELECT 
    schemaname,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'images', 'credit_transactions')
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Check trigger exists
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check profiles table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('id', 'email', 'credits_remaining', 'subscription_status')
ORDER BY ordinal_position;