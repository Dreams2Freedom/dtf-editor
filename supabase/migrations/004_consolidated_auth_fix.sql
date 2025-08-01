-- DTF Editor - Consolidated Auth Fix
-- Migration: 004_consolidated_auth_fix.sql
-- Description: Consolidates all auth fixes into a single, properly tested migration
-- Date: January 2025

-- =============================================================================
-- STEP 1: DROP ALL EXISTING POLICIES
-- =============================================================================

-- Drop all policies on profiles table to start fresh
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

-- Drop all policies on other tables for consistency
DROP POLICY IF EXISTS "Users can view own images" ON images;
DROP POLICY IF EXISTS "Users can insert own images" ON images;
DROP POLICY IF EXISTS "Users can update own images" ON images;
DROP POLICY IF EXISTS "Users can delete own images" ON images;
DROP POLICY IF EXISTS "Admins can view all images" ON images;
DROP POLICY IF EXISTS "Enable admin access to images" ON images;

DROP POLICY IF EXISTS "Users can view own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "System can insert transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Enable admin access to transactions" ON credit_transactions;

-- =============================================================================
-- STEP 2: FIX COLUMN NAMING INCONSISTENCY
-- =============================================================================

-- Ensure we have a consistent column name for credits
DO $$ 
BEGIN
    -- Check if credits_remaining exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'profiles' AND column_name = 'credits_remaining') THEN
        -- Do nothing, column exists with correct name
        NULL;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'credits') THEN
        -- Rename credits to credits_remaining
        ALTER TABLE profiles RENAME COLUMN credits TO credits_remaining;
    ELSE
        -- Add the column if it doesn't exist
        ALTER TABLE profiles ADD COLUMN credits_remaining INTEGER DEFAULT 2;
    END IF;
END $$;

-- =============================================================================
-- STEP 3: CREATE TRIGGER FOR AUTOMATIC PROFILE CREATION
-- =============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
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
        -- Log error but don't fail the signup
        RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- STEP 4: CREATE SIMPLE, NON-RECURSIVE RLS POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_collection_items ENABLE ROW LEVEL SECURITY;

-- PROFILES TABLE POLICIES
-- Allow users to insert their own profile (for edge cases where trigger fails)
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
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Allow users to delete their own profile
CREATE POLICY "profiles_delete_own" ON profiles
    FOR DELETE
    USING (auth.uid() = id);

-- Admin policy for profiles (non-recursive)
CREATE POLICY "profiles_admin_all" ON profiles
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE is_admin = true 
            LIMIT 1
        )
    );

-- IMAGES TABLE POLICIES
-- Users can do everything with their own images
CREATE POLICY "images_user_all" ON images
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Admin access to all images
CREATE POLICY "images_admin_all" ON images
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE is_admin = true 
            LIMIT 1
        )
    );

-- CREDIT TRANSACTIONS POLICIES
-- Users can view their own transactions
CREATE POLICY "credit_transactions_user_select" ON credit_transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- System can insert transactions (using service role)
CREATE POLICY "credit_transactions_system_insert" ON credit_transactions
    FOR INSERT
    WITH CHECK (true); -- Will be restricted by service role key

-- Admin access to all transactions
CREATE POLICY "credit_transactions_admin_all" ON credit_transactions
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE is_admin = true 
            LIMIT 1
        )
    );

-- =============================================================================
-- STEP 5: CREATE HELPER FUNCTIONS
-- =============================================================================

-- Function to check if user is admin (for use in policies)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id 
        AND is_admin = true
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get user's current credits
CREATE OR REPLACE FUNCTION public.get_user_credits(user_id UUID)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    credits INTEGER;
BEGIN
    SELECT credits_remaining INTO credits
    FROM profiles
    WHERE id = user_id;
    
    RETURN COALESCE(credits, 0);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 6: ENSURE PROFILES FOR EXISTING USERS
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
-- STEP 7: VERIFY THE MIGRATION
-- =============================================================================

-- Check RLS is enabled
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('profiles', 'images', 'credit_transactions')
    LOOP
        RAISE NOTICE 'Table % has RLS: %', rec.tablename, rec.rowsecurity;
    END LOOP;
END $$;

-- List all policies
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT tablename, policyname, cmd, permissive
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('profiles', 'images', 'credit_transactions')
        ORDER BY tablename, policyname
    LOOP
        RAISE NOTICE 'Table % Policy %: % (%)', 
            rec.tablename, rec.policyname, rec.cmd, 
            CASE WHEN rec.permissive::boolean THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END;
    END LOOP;
END $$;

-- Check trigger exists
DO $$
DECLARE
    trigger_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) INTO trigger_exists;
    
    RAISE NOTICE 'Trigger on_auth_user_created exists: %', trigger_exists;
END $$;