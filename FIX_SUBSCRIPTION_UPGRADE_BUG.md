# FIX SUBSCRIPTION UPGRADE BUG - COMPLETE GUIDE

## ROOT CAUSE ANALYSIS

### The Problem
User `hello@weprintupress.com` upgraded from Starter to Professional, but dashboard still shows "Starter".

### Why It's Happening

1. **Database Constraint Issue** (PRIMARY CAUSE)
   - The `profiles.subscription_status` column has a CHECK constraint
   - Constraint only allows: `'free', 'basic', 'starter', 'past_due', 'canceled'`
   - **It does NOT allow 'professional'!**
   - Location: `supabase/migrations/20250817_credit_tracking_improvements.sql:15`

2. **Dashboard Display Bug**
   - Dashboard shows `profile.subscription_status` (line 287)
   - But the upgrade code tries to set `subscription_status = 'professional'`
   - Database rejects it due to constraint violation
   - Result: Stays at 'starter'

3. **Inconsistent Column Usage**
   - `subscription_status` is used for BOTH plan names AND Stripe statuses
   - `subscription_plan` also exists but is sometimes not used
   - This dual-purpose usage creates confusion

### Current User State

**In Stripe Production:**
- Customer ID: `cus_TEEgzJ8TbsQT9U`
- Subscription ID: `sub_1SNF6YAsm2LYaw1C5NRb9wNN`
- Plan: **Professional** ($49.99/month)
- Status: **Active**
- ✅ ONLY ONE subscription (not two as initially reported)

**In Database:**
- `subscription_status`: `'starter'` ❌ (should be 'professional')
- `subscription_plan`: `'starter'` ❌ (should be 'professional')
- `stripe_subscription_id`: `sub_1SHmEBAsm2LYaw1CCCSYUuOF` ❌ (OLD subscription ID)
- Credits: 122 ✅

---

## FIX STEPS (IN ORDER!)

### Step 1: Apply Database Migration

Run this SQL in **Supabase SQL Editor** for PRODUCTION:

```sql
-- Fix subscription_status constraint to include 'professional' and 'active'
-- This fixes the bug where users can't upgrade to professional plan

-- Drop the old constraint
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

-- Add new constraint with all valid values including 'professional' and 'active'
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

-- Comment explaining the dual use of this column
COMMENT ON COLUMN public.profiles.subscription_status IS
'This column is used for BOTH plan names (free, basic, starter, professional) AND Stripe subscription statuses (active, canceled, past_due, etc.). This is intentional to maintain backward compatibility.';
```

**How to apply:**
1. Go to https://supabase.com/dashboard/project/gvdngdgvqhcqmfkfmqgb/sql/new
2. Copy/paste the SQL above
3. Click "Run"
4. Verify it says "Success"

### Step 2: Update User's Database Record

After the migration is applied, run the fix script:

```bash
node scripts/fix-subscription-upgrade-issue.js
```

This will:
- ✅ Connect to Stripe Production
- ✅ Fetch the actual subscription (Professional)
- ✅ Update database with correct values:
  - `subscription_status`: `'professional'`
  - `subscription_plan`: `'professional'`
  - `stripe_subscription_id`: `sub_1SNF6YAsm2LYaw1C5NRb9wNN`

### Step 3: Fix the change-plan API Code

Update `/src/app/api/subscription/change-plan/route.ts`:

**BEFORE (line 154):**
```typescript
subscription_status: updatedSubscription.status,  // ❌ Returns "active", not plan name
```

**AFTER:**
```typescript
subscription_status: newPlanId,  // ✅ Use plan ID: "professional", "starter", etc.
```

This ensures future upgrades work correctly.

### Step 4: Add Metadata to Subscription Updates

Update `/src/app/api/subscription/change-plan/route.ts` (line 102-114):

**BEFORE:**
```typescript
const updatedSubscription = await getStripe().subscriptions.update(
  subscription.id,
  {
    items: [
      {
        id: subscriptionItemId,
        price: newPlan.priceId,
      },
    ],
    proration_behavior:
      prorationBehavior as Stripe.SubscriptionUpdateParams.ProrationBehavior,
  }
);
```

**AFTER:**
```typescript
const updatedSubscription = await getStripe().subscriptions.update(
  subscription.id,
  {
    items: [
      {
        id: subscriptionItemId,
        price: newPlan.priceId,
      },
    ],
    metadata: {  // ← ADD THIS
      userId: user.id,
      userEmail: user.email || '',
      fromPlan: profile.subscription_plan,
      toPlan: newPlanId,
    },
    proration_behavior:
      prorationBehavior as Stripe.SubscriptionUpdateParams.ProrationBehavior,
  }
);
```

This helps webhooks identify which user the subscription belongs to.

### Step 5: Test the Fix

1. Check the user's dashboard at: `https://dtfeditor.com/dashboard`
2. Login as: `hello@weprintupress.com`
3. Verify it now shows: **"Professional"** plan
4. Verify credits are correct: 122 credits

### Step 6: Verify Dashboard Code

The dashboard (line 287) displays `profile.subscription_status`:
```typescript
{profile.subscription_status}
```

This is correct! After our fix, `subscription_status` will be 'professional'.

---

## PREVENTING FUTURE ISSUES

### Issue #1: Constraint Too Restrictive

**Problem:** Adding new subscription plans requires updating the database constraint.

**Solution:** Either:
1. Remove the CHECK constraint entirely (risky)
2. OR: Create an ENUM type for subscription statuses
3. OR: Update constraint whenever adding new plans

**Recommendation:** Update the migration file to include all future plans:
- `'enterprise'` (if planning to add)
- Any other tiers

### Issue #2: Inconsistent Column Usage

**Problem:** Two columns (`subscription_status` and `subscription_plan`) are confusing.

**Recommendation for Future:**
- `subscription_plan`: Store plan names (free, basic, starter, professional)
- `subscription_status`: Store Stripe statuses (active, canceled, past_due)
- Update dashboard to display `subscription_plan` instead of `subscription_status`

### Issue #3: Missing Metadata in Subscription Updates

**Problem:** When users upgrade through UI, metadata isn't always included.

**Solution:** Always include `userId` and `userEmail` in Stripe subscription metadata.

---

## FILES CHANGED

1. ✅ `supabase/migrations/20251117_fix_subscription_status_constraint.sql` (NEW)
2. 🔧 `src/app/api/subscription/change-plan/route.ts` (NEEDS UPDATE)
3. ✅ `scripts/fix-subscription-upgrade-issue.js` (NEW - one-time fix)

---

## VERIFICATION CHECKLIST

After completing all steps:

- [ ] Step 1: Migration applied successfully in Supabase SQL Editor
- [ ] Step 2: Script ran and updated database (check output)
- [ ] Step 3: change-plan API code updated (line 154)
- [ ] Step 4: Metadata added to subscription updates (line 102-114)
- [ ] Step 5: User dashboard shows "Professional" plan
- [ ] Step 6: User has correct credits (122)
- [ ] Test: Try upgrading another test user to verify fix works
- [ ] Document in BUGS_TRACKER.md
- [ ] Commit and push changes

---

## ADDITIONAL NOTES

### Why There Appeared to Be Two Subscriptions

The screenshot showed two subscription items in Stripe, but upon investigation:
- There's only ONE active subscription: `sub_1SNF6YAsm2LYaw1C5NRb9wNN`
- It's the Professional plan
- The old subscription ID in the database was from a previous subscription

### Test vs Production Mode

- Your `.env.local` uses TEST keys (`sk_test_...`)
- The production database has LIVE customer IDs (`cus_TEEgzJ8TbsQT9U`)
- This script uses LIVE keys from `.env.local` (`STRIPE_LIVE_SECRET_KEY`)
- **For production deployment**, ensure your app uses LIVE keys

---

## NEED HELP?

If you encounter any issues:
1. Check Supabase logs for errors
2. Check Stripe webhook logs
3. Run: `node scripts/check-subscription-issue.js` to see current state
4. Check: `BUGS_TRACKER.md` for related issues

---

Last Updated: 2025-11-17
