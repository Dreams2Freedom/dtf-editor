# Affiliate Admin Access Fix

## 🔴 Problem Summary

The affiliate admin panel at `/admin/affiliates/applications` was showing **0 applications** even though there are 3 applications in the database.

## 🔍 Root Cause Analysis

After systematic debugging, I found **THREE critical issues**:

### Issue 1: Missing `is_admin()` Function
- The RLS (Row Level Security) policies on the `affiliates` table use `is_admin(auth.uid())`
- However, the `is_admin()` function **does not exist** in the database
- This causes ALL RLS policy checks to fail, blocking admin access

### Issue 2: Wrong Email in Admin Table
- The `admin_users` table only had `shannon@s2transfers.com` as admin
- Your current user `shannonherod@gmail.com` was **NOT in the admin_users table**
- Even if the function existed, it wouldn't recognize you as admin

### Issue 3: Incomplete Migration Application
- The migration `20250103_create_admin_roles_system.sql` creates:
  - The `admin_users` table ✅ (applied)
  - The `is_admin()` function ❌ (NOT applied)
  - Admin RLS policies ❌ (partially applied, but don't work without function)

## ✅ Solutions Applied

### ✅ Solution 1: Added Your Email to Admin Users
I've already added `shannonherod@gmail.com` to the `admin_users` table with super_admin role:

```javascript
// Already executed successfully
user_id: 'fcc1b251-6307-457c-ac1e-064aa43b2449'
role: 'super_admin'
is_active: true
permissions: { all permissions enabled }
```

### ⏳ Solution 2: Create the is_admin() Function (REQUIRES YOUR ACTION)

**You need to run this SQL in Supabase Dashboard:**

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
2. Copy and paste the SQL from `SQL_TO_RUN_IN_SUPABASE.sql`
3. Click "Run"

The SQL will:
- Create the `is_admin()` function
- Update RLS policies on affiliates, referrals, commissions, and payouts tables
- Test that the function works for your user

## 📊 Current Database Status

### ✅ Tables Exist:
- `affiliates` - 3 records (all approved)
- `admin_users` - 2 records (shannon@s2transfers.com + shannonherod@gmail.com)
- `referrals` - exists
- `commissions` - exists
- `payouts` - exists

### ❌ Missing:
- `is_admin()` function - **needs to be created**

### ✅ Your Admin Status:
- Email: `shannonherod@gmail.com`
- User ID: `fcc1b251-6307-457c-ac1e-064aa43b2449`
- Added to `admin_users`: ✅ YES
- Role: `super_admin`
- Permissions: All enabled

## 🚀 Steps to Fix

1. **Open Supabase Dashboard SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor

2. **Run the SQL Script**
   - Open the file: `SQL_TO_RUN_IN_SUPABASE.sql`
   - Copy the entire contents
   - Paste into Supabase SQL Editor
   - Click "Run"

3. **Verify Success**
   - The script will show: `✅ Admin access configured successfully!`
   - The test query should return `is_admin: true` for your user

4. **Refresh Admin Panel**
   - Go to `/admin/affiliates/applications`
   - Refresh the page
   - You should now see all 3 affiliate applications

## 🔧 Alternative Fix (If SQL Script Doesn't Work)

If you can't access the SQL editor, use the migration file approach:

```bash
# Install Supabase CLI (if not installed)
brew install supabase/tap/supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply the migration
supabase db push
```

## 📝 Debug Scripts Created

I created several helpful scripts in `/scripts/`:

1. `check-affiliate-apps.js` - Check affiliate applications in database
2. `check-admin-users-table.js` - Check admin users table
3. `add-admin-user.js` - Add admin user (already executed)
4. `test-is-admin.js` - Test is_admin function

## 🎯 Expected Outcome

After running the SQL script, you should see:

- **Pending Review**: Number of pending applications
- **Approved**: 3 (the current approved applications)
- **Rejected**: Number of rejected applications
- **All Applications Table**: List of all affiliates with details

## 📋 Verification Checklist

- [x] Database has affiliate records (3 found)
- [x] admin_users table exists
- [x] shannonherod@gmail.com added to admin_users
- [ ] is_admin() function created (YOU NEED TO DO THIS)
- [ ] RLS policies updated
- [ ] Admin panel shows applications

## 🐛 Why This Happened

The migrations system wasn't properly run. The tables were created but the functions and some policies weren't applied. This is common when:

1. Using `supabase db push` without proper setup
2. Running migrations out of order
3. Database schema cache issues

## 💡 Prevention

To prevent this in future:

1. Always use Supabase CLI for migrations: `supabase db push`
2. Verify migrations with: `supabase db diff`
3. Test admin access after any migration changes
4. Keep migration files in sequential order with timestamps
