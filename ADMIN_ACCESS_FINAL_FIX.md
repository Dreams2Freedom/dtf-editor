# Admin Access - Final Fix Required

## Issue Found

The admin panel at `/admin/affiliates/applications` shows these errors:
- ❌ React Error #418 (hydration mismatch)
- ❌ 401 Unauthorized errors
- ❌ 404 on `get_admin_role` RPC function

## Root Cause

**Missing database functions in production:**
1. `get_admin_role(user_id)` - Returns user's admin role
2. `is_super_admin(user_id)` - Checks if user is super admin
3. `has_permission(user_id, permission_key)` - Checks specific permissions

These functions exist in migration `20250103_create_admin_roles_system.sql` but were **never applied to production database**.

## Current Production State

✅ **What's Working:**
- Shannon@S2Transfers.com exists in database (stored as lowercase: shannon@s2transfers.com)
- User has `profiles.is_admin = true`
- User is in `admin_users` table with `super_admin` role
- `is_admin()` function works correctly
- 3 affiliate applications exist in database
- Email matching is case-insensitive (you can type it any way)

❌ **What's Missing:**
- `get_admin_role()` function
- `is_super_admin()` function
- `has_permission()` function

## Fix Required

### Step 1: Apply SQL to Production

Run this SQL in Supabase SQL Editor (production):

**File:** `scripts/ADD_MISSING_ADMIN_FUNCTIONS.sql`

```sql
-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = user_id
    AND role = 'super_admin'
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's admin role
CREATE OR REPLACE FUNCTION get_admin_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.admin_users
  WHERE admin_users.user_id = user_id
  AND is_active = true;

  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check specific permission
CREATE OR REPLACE FUNCTION has_permission(user_id UUID, permission_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Super admins have all permissions
  IF is_super_admin(user_id) THEN
    RETURN true;
  END IF;

  -- Check specific permission
  SELECT * INTO admin_record
  FROM public.admin_users
  WHERE admin_users.user_id = user_id
  AND is_active = true;

  IF admin_record IS NULL THEN
    RETURN false;
  END IF;

  -- Check if permission exists and is true
  RETURN COALESCE((admin_record.permissions->permission_key)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 2: Log In to Production

1. Go to: https://dtfeditor.com/auth/login
2. Log in as: **Shannon@S2Transfers.com** (any capitalization works)
3. After login, navigate to: https://dtfeditor.com/admin/affiliates/applications

### Step 3: Verify It Works

After applying the SQL and logging in, you should see:
- ✅ No 404 errors on `get_admin_role`
- ✅ No 401 errors
- ✅ Affiliate applications showing correctly
- ✅ Admin panel fully functional

## Why This Happened

The `20250103_create_admin_roles_system.sql` migration was committed to the codebase but never run against the production Supabase database. The migration creates a comprehensive role-based admin system with these functions.

## Quick Verification

After applying the SQL, run this to verify:
```bash
node scripts/check-admin-functions.js
```

Should show:
```
✅ Function exists: get_admin_role -> super_admin
✅ Function exists: is_super_admin -> true
✅ Function exists: has_permission -> true
```

## Summary

**Required Actions:**
1. ✅ Apply `ADD_MISSING_ADMIN_FUNCTIONS.sql` to production Supabase
2. ✅ Log in as Shannon@S2Transfers.com to production
3. ✅ Test admin panel access

**No Code Changes Needed** - All application code is correct. Just missing database functions.
