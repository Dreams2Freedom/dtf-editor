-- Fix RLS Policies - Migration 003
-- Description: Fixes infinite recursion in profiles table RLS policies

-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create simple, working policies for profiles table
CREATE POLICY "Enable read/write for authenticated users" ON profiles
    FOR ALL USING (auth.uid() = id);

-- Create separate admin policy that doesn't cause recursion
CREATE POLICY "Enable admin access" ON profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles admin_profile
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.is_admin = true
            AND admin_profile.id != profiles.id  -- Prevent self-reference
        )
    );

-- Also fix the admin policies in other tables to prevent similar issues
DROP POLICY IF EXISTS "Admins can view all images" ON images;
CREATE POLICY "Enable admin access to images" ON images
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles admin_profile
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.is_admin = true
        )
    );

DROP POLICY IF EXISTS "Admins can view all transactions" ON credit_transactions;
CREATE POLICY "Enable admin access to transactions" ON credit_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles admin_profile
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.is_admin = true
        )
    );

-- Add a policy to allow profile creation during signup
CREATE POLICY "Enable insert for new users" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Ensure the profiles table has the correct structure for auth integration
-- Add any missing columns that might be needed for auth.users integration
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 5;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_canceled_at TIMESTAMP WITH TIME ZONE;

-- Update the credits_remaining column to match the new credits column
UPDATE profiles SET credits = credits_remaining WHERE credits IS NULL;
ALTER TABLE profiles DROP COLUMN IF EXISTS credits_remaining;

-- Rename credits to credits_remaining for consistency
ALTER TABLE profiles RENAME COLUMN credits TO credits_remaining; 