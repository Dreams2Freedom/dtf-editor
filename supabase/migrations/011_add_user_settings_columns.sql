-- Add columns for user settings
-- Migration: 011_add_user_settings_columns.sql
-- Date: July 2025

-- Add notification_preferences column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "email_marketing": false,
  "email_updates": true,
  "email_tips": true,
  "credit_alerts": true,
  "subscription_reminders": true
}'::jsonb;

-- Add company_name column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Add phone column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_notification_preferences ON profiles USING GIN (notification_preferences);
CREATE INDEX IF NOT EXISTS idx_profiles_company_name ON profiles(company_name);

-- Update RLS policies to include new columns
-- The existing policies should already allow users to update their own profiles
-- No changes needed to RLS policies for these columns