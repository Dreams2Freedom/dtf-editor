# 🔐 ADMIN CREDENTIALS - CRITICAL REFERENCE

## ⚠️ SUPER ADMIN ACCOUNT

**Primary Super Admin Email:** `Shannon@S2Transfers.com`

**DO NOT CONFUSE WITH:**
- ❌ shannonherod@gmail.com (this is NOT the super admin)
- ❌ shannon@s2transfers.com (lowercase version)

## 🎯 Key Facts to Remember

1. **Super Admin Email:** `Shannon@S2Transfers.com` (capital S, capital T)
2. **This email has:**
   - Full super_admin role in admin_users table
   - All permissions enabled
   - Can manage other admins
   - Access to all admin panels

3. **Testing/Secondary Admin:** `shannonherod@gmail.com`
   - Added to admin_users during debugging
   - Also has super_admin role
   - Used for testing only

## 📋 Admin System Architecture

### Database Tables:
1. **`profiles` table:**
   - Column: `is_admin` (boolean)
   - Shannon@S2Transfers.com: `is_admin = true`
   - shannonherod@gmail.com: `is_admin = true`

2. **`admin_users` table (role-based system):**
   - Shannon@S2Transfers.com: `role = 'super_admin'`
   - shannonherod@gmail.com: `role = 'super_admin'`

### Admin Check Function:
```sql
CREATE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Checks BOTH systems
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = check_user_id AND is_admin = true
  ) OR EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = check_user_id AND is_active = true
  );
END;
$$;
```

## 🚨 CRITICAL: Authentication Required

**ALWAYS REMEMBER:**
- Admin access requires ACTIVE AUTHENTICATION (logged in session)
- Production and local environments have SEPARATE sessions
- Must log in separately to production to access admin panel
- No session = No admin access (regardless of database permissions)

## 🔑 Login URLs

**Production:**
- Login: https://dtfeditor.com/auth/login
- Admin Panel: https://dtfeditor.com/admin
- Affiliate Admin: https://dtfeditor.com/admin/affiliates/applications

**Local Development:**
- Login: http://localhost:3000/auth/login
- Admin Panel: http://localhost:3000/admin

## 📝 Common Mistakes to Avoid

### ❌ MISTAKE 1: Wrong Email
- Using `shannonherod@gmail.com` thinking it's the primary admin
- **CORRECT:** Use `Shannon@S2Transfers.com` for production admin access

### ❌ MISTAKE 2: Not Logged In
- Trying to access admin panel without logging in first
- **CORRECT:** Always log in BEFORE accessing admin routes

### ❌ MISTAKE 3: Wrong Environment
- Logged in to localhost, trying to access production
- **CORRECT:** Log in to each environment separately

## 🛠️ Debugging Admin Access Issues

**ALWAYS CHECK FIRST:**
1. ✅ Are you logged in? (Check for "Sign In" button in header)
2. ✅ Using correct email? (Shannon@S2Transfers.com)
3. ✅ On correct environment? (production vs local)

**Then check database:**
4. ✅ User in admin_users table?
5. ✅ profiles.is_admin = true?
6. ✅ is_admin() function exists and works?

## 📊 Admin User IDs (Production)

**Shannon@S2Transfers.com:**
- User ID: `1596097b-8333-452a-a2bd-ea27340677ec`
- Role: `super_admin`
- Status: Active ✅

**shannonherod@gmail.com:**
- User ID: `fcc1b251-6307-457c-ac1e-064aa43b2449`
- Role: `super_admin` (testing only)
- Status: Active ✅

## 🎓 Lessons Learned

**October 4, 2025 - The Great Admin Email Confusion:**
- Spent 4+ hours debugging affiliate admin access
- Root cause: Using wrong admin email (shannonherod@gmail.com)
- Real issue: Not logged in as Shannon@S2Transfers.com
- Lesson: ALWAYS verify login status and correct email FIRST

**Prevention:**
- This file serves as single source of truth
- Check this file BEFORE debugging admin issues
- Update this file if admin emails change
