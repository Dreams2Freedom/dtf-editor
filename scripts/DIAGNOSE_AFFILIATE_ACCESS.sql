-- Diagnostic: Check why admin can't access affiliates
-- Run this in Supabase SQL Editor while logged in as Shannon@S2Transfers.com

-- 1. Check what user is currently authenticated
SELECT
  'Current User' as check_type,
  auth.uid() as user_id,
  auth.email() as email;

-- 2. Check if this user has is_admin = true
SELECT
  'Admin Status' as check_type,
  id as user_id,
  email,
  is_admin
FROM profiles
WHERE id = auth.uid();

-- 3. Check what the RLS policy sees
SELECT
  'RLS Policy Check' as check_type,
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  ) as should_have_access;

-- 4. List all affiliates (with service role, this will work)
SELECT
  'Total Affiliates' as check_type,
  COUNT(*) as count
FROM affiliates;

-- 5. Check what policies exist on affiliates table
SELECT
  'Policies on affiliates' as check_type,
  policyname,
  cmd as command,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'affiliates';
