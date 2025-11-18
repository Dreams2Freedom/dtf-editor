# SUBSCRIPTION UPGRADE BUG - COMPLETE FIX SUMMARY

**Date:** November 17, 2025
**Bug ID:** BUG-058
**Affected User:** hello@weprintupress.com
**Status:** ✅ CODE FIXED - Awaiting Migration

---

## 🔍 WHAT WAS THE PROBLEM?

User `hello@weprintupress.com` upgraded from **Starter** to **Professional** plan, but the dashboard still showed **"Starter"**.

### In Stripe (Production):
- ✅ Subscription: Professional ($49.99/month)
- ✅ Status: Active
- ✅ Payment: Successful
- ✅ Only ONE subscription (no duplicates)

### In Database:
- ❌ `subscription_status`: "starter" (should be "professional")
- ❌ `subscription_plan`: "starter" (should be "professional")
- ❌ `stripe_subscription_id`: OLD subscription ID

### On Dashboard:
- ❌ Shows: "Starter" plan
- ✅ Credits: 122 (correct)

---

## 🎯 ROOT CAUSE

### Primary Issue: Database Constraint Missing 'professional'
```sql
-- OLD CONSTRAINT (TOO RESTRICTIVE)
CHECK (subscription_status IN ('free', 'basic', 'starter', 'past_due', 'canceled'))

-- MISSING: 'professional', 'active', 'trialing', etc.
```

When the code tried to set `subscription_status = 'professional'`, the database rejected it with:
```
ERROR: new row for relation "profiles" violates check constraint "profiles_subscription_status_check"
```

### Secondary Issues:
1. **Wrong field in API**: Used `updatedSubscription.status` (returns "active") instead of `newPlanId` (returns "professional")
2. **Missing metadata**: Stripe subscription updates didn't include `userId`
3. **Missing plan config**: Professional plan wasn't in `PLAN_PRICES` mapping

---

## ✅ WHAT WAS FIXED?

### 1. Database Migration Created ✅
**File:** `supabase/migrations/20251117_fix_subscription_status_constraint.sql`

Added support for all subscription statuses:
- ✅ 'professional' (NEW)
- ✅ 'active' (NEW)
- ✅ 'trialing' (NEW)
- ✅ 'incomplete', 'incomplete_expired', 'unpaid' (NEW)

### 2. API Code Fixed ✅
**File:** `src/app/api/subscription/change-plan/route.ts`

**Changes:**
- Line 22-27: Added Professional plan to PLAN_PRICES
- Line 116-121: Added metadata (userId, userEmail, fromPlan, toPlan)
- Line 165: Changed `subscription_status` to use `newPlanId` instead of Stripe status

### 3. Diagnostic & Fix Scripts Created ✅
**Files:**
- `scripts/fix-subscription-upgrade-issue.js` - One-time fix for affected users
- `FIX_SUBSCRIPTION_UPGRADE_BUG.md` - Complete fix guide

---

## 📋 WHAT YOU NEED TO DO

### STEP 1: Apply Database Migration (REQUIRED!)

1. Go to Supabase SQL Editor:
   https://supabase.com/dashboard/project/gvdngdgvqhcqmfkfmqgb/sql/new

2. Copy/paste this SQL:
   ```sql
   -- Fix subscription_status constraint to include 'professional' and 'active'
   ALTER TABLE public.profiles
   DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

   ALTER TABLE public.profiles
   ADD CONSTRAINT profiles_subscription_status_check
   CHECK (subscription_status IN (
     'free',           -- Free plan
     'basic',          -- Basic subscription
     'starter',        -- Starter subscription
     'professional',   -- Professional subscription (ADDED)
     'active',         -- Active Stripe status (ADDED)
     'past_due',       -- Payment failed
     'canceled',       -- Subscription canceled
     'cancelled',      -- Alt spelling for canceled
     'trialing',       -- Trial period
     'incomplete',     -- Initial subscription not yet paid
     'incomplete_expired', -- Subscription expired before first payment
     'unpaid'          -- Failed to pay
   ));
   ```

3. Click **"Run"**
4. Verify success message

### STEP 2: Fix Affected User's Database Record

After migration is applied, run:
```bash
node scripts/fix-subscription-upgrade-issue.js
```

This will:
- ✅ Connect to Stripe Production
- ✅ Fetch actual subscription (Professional)
- ✅ Update database with correct values

### STEP 3: Deploy Code Changes

The API code is already fixed in the repository. Just deploy:
```bash
git add .
git commit -m "Fix subscription upgrade bug - allow professional plan in database constraint"
git push
```

Or deploy via Vercel/your deployment method.

### STEP 4: Verify the Fix

1. Ask user to login: https://dtfeditor.com/dashboard
2. Check if it now shows **"Professional"** plan
3. Verify credits show correctly

---

## 🔐 IMPORTANT: Using Production Stripe Keys

Your code currently uses **TEST** Stripe keys in `.env.local`:
```
STRIPE_SECRET_KEY=sk_test_...  ❌
```

But you have **LIVE** keys available:
```
STRIPE_LIVE_SECRET_KEY=sk_live_...  ✅
```

The fix script uses the LIVE keys (`STRIPE_LIVE_SECRET_KEY`), which is correct for production users.

**Make sure your production deployment uses LIVE keys!**

---

## 📊 WHAT WAS LEARNED

### Detection
- Database constraint violations can be silent if not logged properly
- Always check database logs when updates fail mysteriously

### Design Issues
- Using `subscription_status` for both plan names AND Stripe statuses is confusing
- Should separate: `subscription_plan` (free/basic/starter/professional) and `subscription_status` (active/canceled/past_due)

### Prevention
- When adding new plans, update database constraints FIRST
- Add validation to prevent constraint violations before DB updates
- Always include `userId` in Stripe metadata for easier debugging

---

## 📁 FILES CREATED/MODIFIED

### Created:
1. ✅ `supabase/migrations/20251117_fix_subscription_status_constraint.sql`
2. ✅ `scripts/fix-subscription-upgrade-issue.js`
3. ✅ `FIX_SUBSCRIPTION_UPGRADE_BUG.md`
4. ✅ `SUBSCRIPTION_UPGRADE_FIX_SUMMARY.md` (this file)

### Modified:
1. ✅ `src/app/api/subscription/change-plan/route.ts`
2. ✅ `BUGS_TRACKER.md`

---

## ✅ COMPLETION CHECKLIST

- [x] Root cause identified (database constraint)
- [x] Migration created
- [x] API code fixed
- [x] Metadata added to Stripe updates
- [x] Professional plan added to config
- [x] Fix script created
- [x] Documentation updated (BUGS_TRACKER.md)
- [x] Comprehensive guide created
- [ ] **Migration applied to production database** ⚠️ **YOU NEED TO DO THIS**
- [ ] **User database record updated** ⚠️ **RUN SCRIPT AFTER MIGRATION**
- [ ] **Code deployed to production**
- [ ] **User verified dashboard shows Professional**

---

## 🆘 IF SOMETHING GOES WRONG

1. **Migration fails?**
   - Check if constraint already exists with different name
   - Try: `SELECT conname FROM pg_constraint WHERE conrelid = 'profiles'::regclass;`

2. **Fix script fails?**
   - Ensure `.env.local` has `STRIPE_LIVE_SECRET_KEY`
   - Check customer ID is correct: `cus_TEEgzJ8TbsQT9U`

3. **User still sees "Starter"?**
   - Check database: `SELECT subscription_status, subscription_plan FROM profiles WHERE email = 'hello@weprintupress.com';`
   - Clear browser cache
   - Logout/login

---

## 📞 NEXT STEPS

1. **Apply the database migration** (Step 1 above) - **DO THIS FIRST!**
2. **Run the fix script** (Step 2 above) - **DO THIS SECOND!**
3. **Deploy the code changes** (Step 3 above)
4. **Verify with the user** (Step 4 above)

All code fixes are complete. The only thing left is applying the migration and running the fix script!

---

**Last Updated:** November 17, 2025
**Estimated Time to Complete:** 10 minutes
**Difficulty:** Easy (just copy/paste SQL and run script)
