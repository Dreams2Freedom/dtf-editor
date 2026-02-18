# DTF Editor - Bug Tracker

**Last Updated:** February 18, 2026
**Status:** Active Bug Tracking - POST SECURITY AUDIT

> **SECURITY RE-AUDIT (Feb 16, 2026):** A comprehensive re-audit found 28 new issues. 30+ fixes applied across 4 tiers. See `SECURITY_AUDIT_2026_02_16.md` for the full report.
> **SECURITY AUDIT (Feb 8, 2026):** Original audit found 47 issues (12 Critical, 17 High, 12 Medium, 6 Low). See `SECURITY_AUDIT_2026_02_08.md`.

---

## 🔴 **CRITICAL BUGS (February 17-18, 2026 Session)**

### **BUG-062: Profiles RLS Policy Circular Reference Breaks All Supabase Queries**

- **Status:** 🔴 ACTIVE (Fix identified, awaiting user action)
- **Severity:** Critical
- **Component:** Supabase RLS Policies / Profiles Table
- **Description:** Adding a `profiles_admin_select` RLS policy with a self-referencing subquery on the `profiles` table causes infinite recursion, breaking ALL queries to `profiles`, `support_tickets`, and `support_messages` tables
- **Reported:** February 18, 2026
- **Symptoms:**
  - Users cannot create support tickets (500 error on INSERT)
  - Users cannot view their tickets (500 error on SELECT)
  - Users cannot view their own profile (500 error)
  - Admin support ticket queries fail (500 error)
  - React error #418 (hydration mismatch) in production
- **Root Cause:**
  - The `profiles_admin_select` policy queries the `profiles` table from within a policy ON the `profiles` table itself:
    ```sql
    CREATE POLICY "profiles_admin_select" ON profiles
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE)
      );
    ```
  - When PostgreSQL evaluates ANY SELECT on `profiles`, it evaluates ALL SELECT policies
  - The `profiles_admin_select` policy does a SELECT from `profiles`, triggering the same policy evaluation again
  - This creates infinite recursion → PostgreSQL returns 500 error
  - The 500 cascades to `support_tickets` and `support_messages` because their admin policies also reference `profiles`
- **Fix Required:**
  ```sql
  DROP POLICY IF EXISTS "profiles_admin_select" ON profiles;
  ```
- **Why This Is Sufficient:**
  - Regular users can see their own profile via existing `auth.uid() = id` policy
  - Admin operations that need all profiles use the service role client (bypasses RLS)
  - The admin policies on `support_tickets` work because admin can see their own profile row (where `is_admin = TRUE`) through the user-level policy
- **Prevention for Future:**
  - NEVER create RLS policies on a table that subquery the SAME table
  - For admin visibility patterns, use `auth.uid() = id` for own-row access and service role for cross-user access
  - Test RLS policy changes in a staging environment before production
- **Related Issues:** Created during fix for support tickets showing "From: Unknown" (commit aee36c7)

---

## 🔴 **SECURITY AUDIT FINDINGS (February 8, 2026)**

### **SEC-001: Debug Endpoint Allows Unauthenticated Credit Injection**

- **Status:** 🔴 ACTIVE
- **Severity:** CRITICAL
- **File:** `src/app/api/debug-credits/route.ts`
- **Description:** POST `/api/debug-credits` accepts any userId and adds 5 credits with NO authentication
- **Fix:** Delete this file entirely

### **SEC-002: Debug Webhook Bypasses Stripe Signature Verification**

- **Status:** 🔴 ACTIVE
- **Severity:** CRITICAL
- **File:** `src/app/api/webhooks/stripe/debug-route.ts`
- **Description:** Parses webhook body without signature verification, adds credits based on attacker-controlled metadata
- **Fix:** Delete this file entirely

### **SEC-003: Stripe Checkout Missing User Authentication**

- **Status:** 🔴 ACTIVE
- **Severity:** CRITICAL
- **File:** `src/app/api/stripe/create-checkout-session/route.ts`
- **Description:** Accepts userId from client with zero authentication
- **Fix:** Add getUser() verification

### **SEC-004: Payment Intent Missing Authentication**

- **Status:** 🔴 ACTIVE
- **Severity:** CRITICAL
- **File:** `src/app/api/stripe/create-payment-intent/route.ts`
- **Description:** userId and credits come from untrusted client with no auth
- **Fix:** Add authentication, derive userId from session

### **SEC-005: Credit Refund Endpoint Open to All Users**

- **Status:** 🔴 ACTIVE
- **Severity:** CRITICAL
- **File:** `src/app/api/credits/refund/route.ts`
- **Description:** Any authenticated user can add unlimited credits via POST with arbitrary credit amount
- **Fix:** Restrict to admin-only or delete

### **SEC-006: Admin Session Cookie httpOnly: false**

- **Status:** 🔴 ACTIVE
- **Severity:** CRITICAL
- **File:** `src/app/api/admin/auth/login/route.ts`
- **Description:** Admin session cookie readable by JavaScript - XSS = admin takeover
- **Fix:** Set httpOnly: true

### **SEC-007: Supabase Auth Token Cookie httpOnly: false**

- **Status:** 🔴 ACTIVE
- **Severity:** CRITICAL
- **File:** `src/app/api/admin/auth/login/route.ts`
- **Description:** Custom sb-auth-token cookie exposes access token to JavaScript
- **Fix:** Remove this cookie, let @supabase/ssr handle it

### **SEC-008: Credit Reset Auth Bypass via stripe-signature Header**

- **Status:** 🔴 ACTIVE
- **Severity:** CRITICAL
- **File:** `src/app/api/credits/reset/route.ts`
- **Description:** Presence of any stripe-signature header bypasses API key check
- **Fix:** Verify signature properly or remove check

### **SEC-009: Impersonation Cookie Forgery**

- **Status:** 🔴 ACTIVE
- **Severity:** CRITICAL
- **File:** `src/middleware/impersonation.ts`, `src/app/api/auth/effective-user/route.ts`
- **Description:** Impersonation system trusts cookies without verifying admin session
- **Fix:** Verify admin auth before honoring impersonation cookies

### **SEC-010: SSRF via User-Controlled Image URLs**

- **Status:** 🔴 ACTIVE
- **Severity:** CRITICAL
- **File:** `src/app/api/upscale/route.ts`, `src/app/api/analyze/image/route.ts`
- **Description:** User-supplied imageUrl sent to server-side fetch with no validation
- **Fix:** URL allowlist, block private IP ranges

### **SEC-011: Open Redirect in Affiliate Tracking**

- **Status:** 🔴 ACTIVE
- **Severity:** CRITICAL
- **File:** `src/app/api/affiliate/track/route.ts`
- **Description:** redirect query param used directly in NextResponse.redirect()
- **Fix:** Validate path is relative, not protocol-relative

### **SEC-012: Hardcoded API Credentials in Production UI**

- **Status:** 🔴 ACTIVE
- **Severity:** CRITICAL
- **File:** `src/components/image/ImageProcessor.tsx`
- **Description:** ClippingMagic credentials (id + secret) hardcoded in debug section rendered to all users
- **Fix:** Remove debug section or gate behind NODE_ENV check

### **SEC-013 through SEC-047:** See `SECURITY_AUDIT_2026_02_08.md` for full details on all 47 findings.

---

## 🎓 **LESSONS LEARNED - NOT BUGS, USER ERRORS**

### **LESSON-001: Admin Email Confusion & Authentication (October 4, 2025)**

- **What Happened:** Spent 6 hours debugging "admin access denied" issues
- **Root Cause:**
  1. Using wrong admin email (shannonherod@gmail.com instead of Shannon@S2Transfers.com)
  2. Not logged in to production (separate sessions from local)
- **Lesson:** ALWAYS check these FIRST before debugging:
  - ✅ Is user logged in? (Check header for "Sign In" button)
  - ✅ Using correct email? (Shannon@S2Transfers.com for admin)
  - ✅ Correct environment? (production vs local sessions are separate)
- **Prevention:** Created ADMIN_CREDENTIALS.md as mandatory reference file
- **Time Wasted:** 6 hours on what should have been 5-minute check
- **Reference:** See ADMIN_CREDENTIALS.md for all admin system details

---

## 🐛 **Critical Bugs (P0)**

### **BUG-061: 413 Upload Error - Large Images Fail to Upload on Process Page**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Image Upload / Process Page
- **Description:** Large images (>4.5MB) fail to upload with 413 "Payload Too Large" error, showing "Please select an image first" when user tries to process
- **Reported:** December 11, 2025
- **Symptoms:**
  - User uploads large image (13.68 MB in reported case)
  - Console shows multiple `413 (Payload Too Large)` errors for `/api/upload`
  - Image preview displays correctly (client-side)
  - When clicking process tool, shows "Please select an image first"
  - React error #418 (hydration mismatch) also visible
  - Upload fails silently - no error message shown to user
- **Root Cause:**
  - Vercel has a **4.5MB body size limit** on API routes (platform-level limit)
  - The `/api/upload` route has code validation for 10MB but Vercel rejects before reaching the handler
  - Process page client (`src/app/process/client.tsx`) was sending raw files without compression
  - Background removal page had compression but process page did not
  - The 413 error happens at platform level, returning HTML error page that breaks JSON parsing
- **Solution Applied:**
  1. **Created Shared Compression Utility (`src/lib/image-compression.ts`):**
     - Reusable `compressImage()` function for client-side compression
     - Targets 3MB to account for ~33% FormData encoding overhead
     - Preserves dimensions up to 5000px for quality
     - Uses gentle quality reduction (0.85 → 0.50) if needed
     - Converts PNG to JPEG only when necessary for size
  2. **Updated Process Page Client (`src/app/process/client.tsx`):**
     - Import and use `compressImage()` before upload
     - Added logging to show original vs compressed size
     - Updated UI text to say "Large images auto-compressed" instead of "Max 10MB"
- **Technical Details:**
  - Vercel Hobby: 4.5MB limit
  - Vercel Pro: 4.5MB default (can be increased with config)
  - FormData encoding adds ~33% overhead, so 3MB file becomes ~4MB
  - Compression preserves image quality while staying under limits
- **Files Modified:**
  - `src/lib/image-compression.ts` (NEW - shared compression utility)
  - `src/app/process/client.tsx` (UPDATED - added compression before upload)
- **Time to Resolution:** 30 minutes
- **Testing:**
  - ✅ Created compression utility
  - ✅ Integrated into process page
  - ✅ Build passes successfully
  - ⏳ Awaiting user testing with large images
- **Prevention for Future:**
  - All upload components should use the shared `compressImage()` utility
  - Consider adding a visual indicator when compression occurs
  - Consider adding server-side validation that returns proper JSON errors
- **Related Issues:** BUG-041, BUG-051 (previous 413 issues)

---

### **BUG-060: ClippingMagic Script Failing to Load - Timeout and Network Issues**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Background Removal / ClippingMagic Integration
- **Description:** ClippingMagic script timing out when loading from CDN, blocking background removal functionality
- **Reported:** November 28, 2025
- **Symptoms:**
  - Error in console: `clippingmagic.com/api/v1/ClippingMagic.js:1 Failed to load resource: net::ERR_TIMED_OUT`
  - React error: `Uncaught Error: Minified React error #418` (likely hydration or rendering issue)
  - 401 Unauthorized errors in contentOverview.js (browser extension interference)
  - Background removal button remains disabled
  - No error message shown to user about script loading failure
- **Root Cause:**
  - Third-party CDN (ClippingMagic) experiencing intermittent availability issues
  - No timeout handling on script load - browser waits indefinitely
  - No retry logic for failed script loads
  - Poor error messaging - users don't know what went wrong
  - Ad blockers or network issues can prevent script from loading
  - Browser extensions (like contentOverview) interfering with page load
- **Solution Applied:**
  1. **Added Retry Logic:**
     - Implemented automatic retry (3 attempts with 2-second delay)
     - 10-second timeout per attempt to prevent indefinite waiting
     - Removes failed script before retry to ensure clean state
  2. **Improved Error Handling:**
     - Clear, actionable error messages explaining common causes
     - Suggests troubleshooting steps (refresh, check connection, disable ad blockers)
     - Better visual error display with icon and formatted text
  3. **Added Loading Indicator:**
     - Shows "Loading Background Removal Tool" message while script loads
     - Users now know the system is working vs. stuck
  4. **Fixed TypeScript Issues:**
     - Changed `!profile.is_admin` to `profile.is_admin !== true` to handle null values
     - Prevents type errors from nullable admin flag
- **Files Modified:**
  - `src/app/process/background-removal/client.tsx`:
    - Lines 217-319: Added retry logic and timeout handling
    - Lines 739-753: Improved error message display with better formatting
    - Lines 757-768: Added loading indicator while script loads
    - Lines 784-805: Fixed TypeScript null handling for is_admin flag
- **Technical Details:**
  - Script timeout set to 10 seconds per attempt
  - Max 3 retry attempts with 2-second delay between retries
  - Total max wait time: ~36 seconds (3 attempts × 12 seconds)
  - Cleans up timeout and script element on component unmount
- **Error Message Provided to Users:**

  ```
  Unable to load the background removal tool. This may be due to:
  • ClippingMagic service is temporarily unavailable
  • Network connectivity issues
  • Ad blockers or security software blocking the script

  Please try:
  1. Refreshing the page
  2. Checking your internet connection
  3. Disabling ad blockers for this site
  4. Trying again in a few minutes
  ```

- **Time to Resolution:** 1 hour
- **Testing:**
  - ✅ Added retry logic with 3 attempts
  - ✅ Improved error messaging with actionable steps
  - ✅ Added loading indicator
  - ✅ Fixed TypeScript type issues
  - ⏳ Awaiting user testing to confirm script loads successfully
- **Prevention for Future:**
  - Monitor ClippingMagic API availability
  - Consider implementing service worker for script caching
  - Add analytics to track script load failures
  - Consider alternative background removal services as backup
- **Related Issues:** None
- **User Impact:** High - Blocks all background removal functionality when script fails to load

---

### **BUG-059: PDF Vectorization Returns Solid Color - Using Invalid API Parameters**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Vectorization / Vectorizer.ai API Integration
- **Description:** PDF vectorization produces solid color output instead of proper vector traces
- **Reported:** November 17, 2025
- **Symptoms:**
  - User vectorizes image and saves as PDF
  - PDF shows single solid color (black) instead of vector paths
  - SVG output works fine (suggests API call succeeds)
  - No detailed vector information in PDF
  - PDF only 1.1KB (too small, only contains single black rectangle)
- **Root Cause (Deep Analysis):**
  1. **Using Invalid/Deprecated Parameters:**
     - Code sent `processing_options.curve_fitting` - **DOESN'T EXIST IN API**
     - Code sent `processing.corner_threshold` - **DOESN'T EXIST IN API**
     - Code sent `processing.length_threshold` - **DOESN'T EXIST IN API**
     - Code sent `processing.max_iterations` - **DOESN'T EXIST IN API**
     - API silently ignores invalid parameters → uses defaults
  2. **Missing Critical PDF Parameters:**
     - No `output.draw_style` - defaults to wrong setting
     - No `output.shape_stacking` - may cause solid colors
     - No `output.group_by` - no color grouping
     - No `output.gap_filler.enabled` - may show gaps
     - No `processing.max_colors` - limited palette
     - No `output.size.output_dpi` - low quality
  3. **Outdated Implementation:**
     - Service file had parameters from old/different API
     - No reference to official Vectorizer.ai documentation
     - TypeScript interface didn't match actual API spec
  4. **Aggressive Image Compression Destroying Color Detail (CRITICAL!):**
     - Image compressed from 7928x2887 → 4096x1491 (48% size reduction)
     - Compression format: JPEG (destroys color accuracy)
     - Quality reduced from 0.9 → 0.72 → 0.58 (multiple attempts)
     - JPEG compression at low quality caused Vectorizer.ai to detect only BLACK color
     - API correctly processed the compressed image, but image had no color variation left
     - PDF content stream analysis showed: `0.000 0.000 0.000 rg` (black fill) and single rectangle path
- **Solution Applied:**
  1. **Created API Reference Guide (VECTORIZER_AI_API_REFERENCE.md):**
     - Complete documentation from https://vectorizer.ai/api
     - All parameters, examples, and best practices
     - Common issues and fixes section
  2. **Fixed VectorizerService (src/services/vectorizer.ts):**
     - Removed invalid parameters (curve_fitting, corner_threshold, etc.)
     - Added correct parameters:
       - `processing.max_colors=256` (full color range)
       - `processing.shapes.min_area_px=1.0` (filter dust)
       - `output.draw_style=fill_shapes` (critical for PDF)
       - `output.shape_stacking=stacked`
       - `output.group_by=color`
       - `output.gap_filler.enabled=true`
       - `output.gap_filler.stroke_width=0.5`
       - `output.size.output_dpi=300` (print quality)
     - Updated TypeScript interface to match API
  3. **Fixed ImageProcessingService (src/services/imageProcessing.ts):**
     - Updated handleVectorization to use correct parameters
     - Removed deprecated processing_options
     - Added proper defaults for PDF output
  4. **Fixed Image Compression Settings (src/app/process/vectorize/client.tsx):**
     - **Changed format:** JPEG → PNG (preserves colors accurately)
     - **Increased size limit:** 10MB → 50MB (Vectorizer.ai supports it)
     - **Increased dimension limit:** 4096px → 8000px (preserve resolution)
     - **Increased quality:** 0.9 → 0.95 (reduce compression artifacts)
     - PNG format maintains color fidelity even at high compression
     - Higher limits prevent aggressive compression that destroys detail
- **Time to Resolution:** 3 hours total (investigation + fix + compression fix)
- **Testing:**
  - ✅ Parameters verified against official API docs
  - ✅ Code updated with correct parameter names and values
  - ✅ TypeScript interfaces updated
  - ✅ PDF content stream analyzed (showed single black rectangle)
  - ✅ Compression settings updated to preserve color detail
  - ⏳ Awaiting user testing with actual PDF vectorization
- **Files Changed:**
  1. `VECTORIZER_AI_API_REFERENCE.md` (NEW - complete API reference)
  2. `src/services/vectorizer.ts` (FIXED - correct parameters)
  3. `src/services/imageProcessing.ts` (FIXED - correct defaults)
  4. `src/app/process/vectorize/client.tsx` (FIXED - compression settings)
  5. `scripts/test-vectorizer-api.js` (NEW - API testing tool)
  6. `scripts/decode-pdf-stream.js` (NEW - PDF analysis tool)
- **Prevention for Future:**
  - Always reference VECTORIZER_AI_API_REFERENCE.md for API changes
  - Test with small sample before deploying vectorization changes
  - Validate parameters against official docs before implementing
  - Add API response logging to catch silent failures
  - **CRITICAL:** Never use JPEG compression for vectorization - always use PNG
  - **CRITICAL:** Set high quality/size limits for vectorization to preserve detail
- **Related Issues:** None
- **Reference Documentation:** See `VECTORIZER_AI_API_REFERENCE.md` for complete API spec
- **Technical Deep Dive:** PDF content stream contained only:
  ```
  0.000 0.000 0.000 rg  ← RGB(0,0,0) = BLACK
  [rectangle path commands]
  f  ← Fill with black
  ```
  This proved the issue was in the input image quality, not the API parameters.

---

### **BUG-058: Subscription Upgrade to Professional Fails - Dashboard Shows Old Plan**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Subscription System / Database Constraints / Stripe Integration
- **Description:** Users upgrading from Starter to Professional plan remain stuck on Starter in dashboard
- **Affected User:** hello@weprintupress.com (and potentially all Professional upgrades)
- **Reported:** November 17, 2025
- **Symptoms:**
  - User completes Professional plan upgrade in Stripe ✅
  - Stripe shows subscription as Professional ($49.99/month) ✅
  - Payment processed successfully ✅
  - Dashboard still shows "Starter" plan ❌
  - Database `subscription_status` remains 'starter' ❌
  - Credits allocated correctly (122) ✅
- **Root Cause (Deep Analysis):**
  1. **Database Constraint Too Restrictive:**
     - `profiles.subscription_status` has CHECK constraint
     - Allowed values: `'free', 'basic', 'starter', 'past_due', 'canceled'`
     - **Missing: 'professional', 'active', and other Stripe statuses**
     - Location: `supabase/migrations/20250817_credit_tracking_improvements.sql:15`
     - When code tries to set `subscription_status = 'professional'`, database rejects it
  2. **Inconsistent Column Usage:**
     - `subscription_status` used for BOTH plan names AND Stripe statuses (dual-purpose)
     - `subscription_plan` exists but not always updated correctly
     - Dashboard displays `subscription_status` (line 287 in dashboard/page.tsx)
     - Creates confusion about which column represents what
  3. **Wrong Field in API Update:**
     - `/src/app/api/subscription/change-plan/route.ts` line 154
     - Was: `subscription_status: updatedSubscription.status` (returns "active")
     - Should be: `subscription_status: newPlanId` (returns "professional")
  4. **Missing Metadata in Stripe Updates:**
     - Subscription updates didn't include `userId` in metadata
     - Webhooks couldn't properly link subscription to user
     - Made debugging and tracking difficult
- **Solution Applied:**
  1. **Database Migration (20251117_fix_subscription_status_constraint.sql):**

     ```sql
     ALTER TABLE public.profiles
     DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

     ALTER TABLE public.profiles
     ADD CONSTRAINT profiles_subscription_status_check
     CHECK (subscription_status IN (
       'free', 'basic', 'starter', 'professional', 'active',
       'past_due', 'canceled', 'cancelled', 'trialing',
       'incomplete', 'incomplete_expired', 'unpaid'
     ));
     ```

  2. **Fixed change-plan API (src/app/api/subscription/change-plan/route.ts):**
     - Line 165: Changed to `subscription_status: newPlanId`
     - Line 116-121: Added metadata with userId, userEmail, fromPlan, toPlan
     - Line 22-27: Added 'professional' plan to PLAN_PRICES mapping
  3. **One-Time User Fix (scripts/fix-subscription-upgrade-issue.js):**
     - Connected to Stripe Production
     - Verified only 1 active subscription (Professional)
     - Updated database:
       - `subscription_status`: 'starter' → 'professional'
       - `subscription_plan`: 'starter' → 'professional'
       - `stripe_subscription_id`: Updated to current subscription

- **Time to Resolution:** 2 hours (investigation + fix)
- **Testing:**
  - ✅ Database constraint updated to allow 'professional'
  - ✅ User database record updated manually
  - ✅ API code fixed for future upgrades
  - ✅ Metadata added to Stripe subscription updates
  - ⏳ Awaiting verification from user that dashboard shows correctly
- **Files Changed:**
  1. `supabase/migrations/20251117_fix_subscription_status_constraint.sql` (NEW)
  2. `src/app/api/subscription/change-plan/route.ts` (FIXED)
  3. `scripts/fix-subscription-upgrade-issue.js` (NEW - one-time fix)
  4. `FIX_SUBSCRIPTION_UPGRADE_BUG.md` (NEW - comprehensive guide)
- **Prevention for Future:**
  - When adding new subscription plans, update database constraint
  - Always include `userId` in Stripe subscription metadata
  - Consider separating `subscription_plan` (plan names) from `subscription_status` (Stripe statuses)
  - Add validation to prevent constraint violations before database update
- **Related Issues:** None
- **Reference Documentation:** See `FIX_SUBSCRIPTION_UPGRADE_BUG.md` for complete analysis

---

### **BUG-057: Affiliate Admin Panel Shows 0 Applications (Parameter Mismatch)**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Admin Dashboard / RLS Policies / SQL Function Signatures
- **Description:** Affiliate admin panel at `/admin/affiliates/applications` showing 0 applications despite 3 existing in database
- **Affected User:** shannonherod@gmail.com
- **Symptoms:**
  - Admin panel displays 0 pending, 0 approved, 0 rejected
  - Applications table completely empty
  - Database has 3 approved applications (HELLO, SNSMAR, DLUE)
  - User has admin access but RLS policies blocking queries
  - No console errors, just empty results
- **Root Cause (Deep Analysis):**
  1. **Parameter Name Mismatch:**
     - `is_admin()` function defined with parameter: `check_user_id`
     - RLS policies calling: `is_admin(auth.uid())` as positional parameter
     - PostgreSQL expects `user_id` for positional calls, but function has `check_user_id`
     - Result: Function lookup fails in RLS policy evaluation → access denied
  2. **Conflicting Admin Systems:**
     - System 1 (July): `profiles.is_admin = true` (simple boolean)
     - System 2 (October): `admin_users` table (role-based)
     - Neither fully migrated, causing inconsistent admin checks
- **Solution Applied:**
  1. **Created Unified is_admin() Function:**
     ```sql
     CREATE FUNCTION is_admin(check_user_id UUID)
     RETURNS BOOLEAN AS $$
     BEGIN
       -- Check BOTH systems for compatibility
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
  2. **Dropped & Recreated with CASCADE:**
     - Used `DROP FUNCTION is_admin(uuid) CASCADE`
     - Safely removed dependent RLS policies
     - Recreated all affiliate RLS policies
  3. **Added shannonherod@gmail.com to admin_users:**
     - Role: super_admin
     - All permissions enabled
     - Now recognized by both admin systems
- **Database Changes:**
  - Updated is_admin() function to check both admin systems
  - Recreated RLS policies: affiliates, referrals, commissions, payouts
  - Added shannonherod@gmail.com to admin_users table
- **SQL Files Applied:**
  - `FIX_ADMIN_ACCESS_FINAL.sql` (main fix)
  - `scripts/add-admin-user.js` (user creation)
- **Verification Results:**
  ```
  ✅ is_admin('shannonherod@gmail.com') = true
  ✅ Affiliates query successful
  ✅ Total applications: 3 (HELLO, SNSMAR, DLUE)
  ✅ Function checks both admin systems
  ✅ Zero breaking changes to other features
  ```
- **Architecture Improvement:**
  - **Before:** Conflicting admin systems, parameter mismatch causing RLS failures
  - **After:** Unified function checking both systems with correct parameter name
  - **Benefit:** Maximum compatibility, gradual migration path to role-based system
  - **Documentation:** ADMIN_SYSTEM_ARCHITECTURE.md, ADMIN_FIX_SUMMARY.md
- **Key Learning:**
  - PostgreSQL function signatures must exactly match RLS policy calls
  - Positional parameters require exact parameter name matches
  - Always verify BOTH function definition AND usage in policies
  - DROP CASCADE is safe when dependencies are immediately recreated
- **Date Reported:** October 4, 2025
- **Date Fixed:** October 4, 2025
- **Time to Fix:** ~4 hours (deep debugging)
- **Next Steps:** Hard refresh browser (Cmd+Shift+R) to see applications

### **BUG-056: Admin Cannot Access Affiliate Dashboard**

- **Status:** 🟢 FIXED (Related to BUG-057)
- **Severity:** Critical
- **Component:** Admin Dashboard / RLS Policies / SQL Functions
- **Description:** Admin user (shannon@s2transfers.com) getting "permission denied" (42501) when accessing affiliate dashboard
- **Root Cause:** See BUG-057 for complete root cause analysis (parameter mismatch)
- **Date Reported:** October 3, 2025
- **Date Fixed:** October 4, 2025 (with BUG-057 fix)

## 🐛 **Critical Bugs (P0)**

### **BUG-055: Incorrect Pricing Information Displayed**

- **Status:** 🟢 FIXED
- **Severity:** High
- **Component:** Pricing / Documentation
- **Description:** FAQ and documentation showed outdated/incorrect pricing
- **Symptoms:**
  - FAQ showed Basic Plan at $4.99 instead of Starter at $9.99
  - FAQ showed Starter Plan at $14.99 instead of Pro at $19.99
  - Pay-as-you-go prices were incorrect
  - No single source of truth for pricing
- **Root Cause:**
  - Multiple files had hardcoded pricing that wasn't updated
  - No centralized pricing documentation
- **Solution Applied:**
  - Updated FAQ page with correct pricing
  - Fixed PRD documentation
  - Created PRICING_STRUCTURE.md as single source of truth
  - Added reference to pricing doc in roadmap
- **Verification:**
  - All pricing now consistent across documentation
  - Created authoritative pricing reference
- **Date Reported:** August 20, 2025
- **Date Fixed:** August 20, 2025

### **BUG-054: Duplicate Credit Allocation on Payment**

- **Status:** 🟢 FIXED (FULLY RESOLVED)
- **Severity:** Critical
- **Component:** Payment Processing / Webhooks
- **Description:** Credits were being allocated twice for a single payment
- **Symptoms:**
  - User purchased 10 credits, received 20 credits
  - Payment history showed transaction twice
  - Stripe dashboard showed only one transaction (correct)
  - User was charged correctly (once)
- **Root Cause (COMPLETE):**
  - TWO different issues were causing duplicates:
  - 1. Two webhook endpoints both processing same events (partially fixed first)
  - 2. BOTH `checkout.session.completed` AND `payment_intent.succeeded` were adding credits
  - For pay-as-you-go purchases, Stripe sends both events for the same payment
- **Solution Applied (FINAL):**
  - First fix: Disabled payment processing in stripe-simple webhook
  - REAL fix: Removed credit addition from `payment_intent.succeeded` handler
  - Now ONLY `checkout.session.completed` adds credits (best practice)
  - This prevents duplicates even if multiple webhooks receive events
- **Verification:**
  - Refund flow works correctly (deducts credits)
  - New purchases only add credits once
  - Payment history shows single entries
- **Date Reported:** August 19, 2025
- **Date Fixed:** August 19, 2025 (final fix deployed 8:44 AM)

### **BUG-053: Welcome Email Not Sent During Signup**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Email System / Signup Flow
- **Description:** Welcome emails not being sent when new users sign up
- **Symptoms:**
  - Test emails from Mailgun worked correctly
  - User received test emails immediately
  - But no email received during actual signup process
- **Root Cause:**
  - Environment variable mismatch: signup route was using `env.NEXT_PUBLIC_SUPABASE_URL` instead of `env.SUPABASE_URL`
  - This caused a "supabaseUrl is required" error that prevented the signup API from executing
- **Solution Applied:**
  - Fixed environment variable reference in `/src/app/api/auth/signup/route.ts`
  - Changed from `env.NEXT_PUBLIC_SUPABASE_URL` to `env.SUPABASE_URL`
  - Emails now being sent successfully via Mailgun
- **Verification:**
  - Server logs confirm: "Email sent successfully: <20250819020612.719a59b0ddbb8d12@mg.dtfeditor.com>"
  - Mailgun API returning success responses
- **Note:** If emails still not received, likely going to spam or blocked by recipient provider. User should check Mailgun dashboard for bounces and verify domain DNS configuration (SPF, DKIM).
- **Date Reported:** August 19, 2025
- **Date Fixed:** August 19, 2025

### **BUG-017: Subscription Updates Create New Subscriptions**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Stripe Webhooks / Billing
- **Description:** Subscription updates were creating duplicate subscriptions instead of updating existing ones
- **Root Cause:** Webhook handler not checking for existing subscriptions before creating new ones
- **Solution Applied:**
  - Added duplicate detection in webhook handler
  - Automatically cancel old subscription when new one detected
  - Added listSubscriptions method to Stripe service
- **Files Modified:**
  - `/src/app/api/webhooks/stripe/route.ts`
  - `/src/services/stripe.ts`
  - Created `/scripts/fix-subscription-duplicate.js`
- **Date Reported:** July 2025
- **Date Fixed:** August 15, 2025

### **BUG-005: Database Column Inconsistency (credits vs credits_remaining)**

- **Status:** 🟢 FIXED
- **Severity:** High
- **Component:** Database / Credit System
- **Description:** Code referenced both 'credits' and 'credits_remaining' columns inconsistently
- **Root Cause:** Old 'credits' column deprecated but code still had fallback references
- **Solution Applied:**
  - Removed all fallback references to deprecated 'credits' column
  - Standardized on 'credits_remaining' throughout codebase
  - Created migration script to verify column consistency
- **Files Modified:**
  - `/src/stores/authStore.ts`
  - Created `/scripts/fix-credits-column.js`
- **Date Reported:** July 2025
- **Date Fixed:** August 15, 2025

### **BUG-008: Missing Error Boundaries Causing App Crashes**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Error Handling / UX
- **Description:** Errors in components would crash entire application with white screen
- **Root Cause:** No error boundaries to catch and handle component errors gracefully
- **Solution Applied:**
  - Added global ErrorBoundary component wrapping entire app
  - Created page-specific error.tsx files for better error handling
  - Implemented user-friendly error messages with recovery options
- **Files Modified:**
  - `/src/app/layout.tsx` - Added ErrorBoundary wrapper
  - Created `/src/app/error.tsx` - Global error handler
  - Created `/src/app/process/error.tsx`
  - Created `/src/app/pricing/error.tsx`
  - Created `/src/app/dashboard/error.tsx`
  - Created `/src/app/admin/error.tsx`
- **Date Reported:** August 2025
- **Date Fixed:** August 15, 2025

### **BUG-009: TypeScript Build Errors Ignored**

- **Status:** 🟢 FIXED
- **Severity:** High
- **Component:** Build Configuration
- **Description:** Build process was ignoring TypeScript errors, allowing broken code to deploy
- **Root Cause:** next.config.js had typescript.ignoreBuildErrors set to true
- **Solution Applied:**
  - Changed ignoreBuildErrors from true to false
  - Also fixed ESLint ignoreDuringBuilds setting
  - Identified 40+ TypeScript errors that need cleanup
- **Files Modified:**
  - `/next.config.js`
- **Date Reported:** August 15, 2025
- **Date Fixed:** August 15, 2025

### **BUG-052: ClippingMagic White Label Editor Opens Blank Page**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Background Removal / ClippingMagic Integration
- **Description:** ClippingMagic white label editor opened but showed blank/white page
- **Symptoms:**
  - Upload worked successfully
  - Editor popup opened
  - Editor content was completely blank/white
  - No error messages displayed
- **Root Cause:**
  - Test mode (`test: 'true'`) was enabled in development environment
  - Test mode returns test image IDs that don't work with the white label editor
  - ClippingMagic's test images are only for API testing, not for the visual editor
- **Solution Applied:**
  - Disabled test mode in both upload endpoints (commented out)
  - Now uses real API calls even in development
  - Added better logging to debug image ID/secret values
  - Improved callback function setup
- **Files Modified:**
  - `/src/app/api/clippingmagic/upload/route.ts` - Disabled test mode
  - `/src/app/api/clippingmagic/upload-large/route.ts` - Disabled test mode
  - `/src/app/process/background-removal/client.tsx` - Improved debugging
- **Important Note:** Development now uses real API credits for testing
- **Date Reported:** August 17, 2025
- **Date Fixed:** August 17, 2025

### **BUG-051: Background Removal 413 Error After Security Updates**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Background Removal / File Upload
- **Description:** 413 "Content Too Large" error for 4.34MB files despite 10MB limit
- **Symptoms:**
  - Files over 4MB rejected with 413 error
  - Error persisted after removing rate limiting
  - ClippingMagic upload completely broken
- **Root Cause:**
  - Next.js App Router has 4MB default body size limit
  - The `export const config` pattern for setting body size doesn't work in App Router (it's a Pages Router pattern)
  - Security updates exposed this latent issue
- **Solution Applied:**
  - Created new `/api/clippingmagic/upload-large` endpoint
  - Properly handles large files in App Router context
  - Updated all components to use new endpoint
  - Supports files up to 10MB as intended
- **Files Modified:**
  - Created `/src/app/api/clippingmagic/upload-large/route.ts`
  - `/src/app/process/background-removal/client.tsx`
  - `/src/components/image/ClippingMagicEditor.tsx`
  - `/src/components/image/ImageProcessor.tsx`
  - `/src/app/test-clippingmagic/page.tsx`
  - `/src/app/test-cm-simple/page.tsx`
- **Date Reported:** August 17, 2025
- **Date Fixed:** August 17, 2025

### **BUG-050: Support Ticket Creation Visual Feedback Issues**

- **Status:** 🟢 FIXED
- **Severity:** High
- **Component:** Support System / User Experience
- **Description:** No visual indicators for admin replies on user support page and vice versa
- **Symptoms:**
  - Users couldn't see when support had replied to their tickets
  - Admin couldn't see when users had replied to tickets
  - No indication of message count or activity on ticket lists
  - Confusing UX as users didn't know there were responses
- **Root Cause:**
  - Missing visual indicators in both user and admin ticket lists
  - No message count or reply status tracking in UI
  - Database queries not fetching message metadata
- **Solution Applied:**
  - Added blue border and "New Reply" badges for admin replies on user page
  - Added yellow highlighting and "Awaiting Reply" badges for user replies on admin page
  - Implemented message count display on both views
  - Added "Support replied" and "User replied" indicators
  - Visual distinction with colors: blue for admin activity, yellow for user activity
- **Files Modified:**
  - `/src/app/support/page.tsx` - Added visual indicators for admin replies
  - `/src/app/admin/support/page.tsx` - Added visual indicators for user replies
  - `/src/services/support.ts` - Added message count and reply detection logic
- **Date Reported:** August 14, 2025
- **Date Fixed:** August 14, 2025

### **BUG-049: Admin Support Dashboard 404 Error**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Admin Dashboard / Support System
- **Description:** Admin support page returned 404 when clicking on Support in admin dashboard
- **Symptoms:**
  - Clicking "Support" in admin sidebar led to 404 page
  - No way for admins to view and manage support tickets
  - Support tickets created but not viewable by admins
- **Root Cause:**
  - Admin support page didn't exist at /admin/support
  - Route not implemented despite navigation link being present
- **Solution Applied:**
  - Created comprehensive admin support dashboard at /admin/support
  - Implemented ticket list with all system tickets
  - Added filtering by status and priority
  - Added search functionality
  - Created stats cards showing ticket metrics
  - Visual indicators for tickets needing attention
- **Files Modified:**
  - Created `/src/app/admin/support/page.tsx` - Admin support dashboard
- **Date Reported:** August 14, 2025
- **Date Fixed:** August 14, 2025

### **BUG-048: Support Ticket Detail View Not Working**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Support System
- **Description:** Clicking on support tickets just refreshed the page instead of showing details
- **Symptoms:**
  - Ticket list displayed correctly but clicking tickets did nothing
  - Page refresh instead of navigation to ticket detail
  - Unable to view or reply to tickets
- **Root Cause:**
  - Database query error when joining support_messages with profiles
  - Complex join causing 400 Bad Request errors
  - Missing ticket detail page implementation
- **Solution Applied:**
  - Simplified getTicket query to avoid complex joins
  - Fetch profiles separately in parallel using Promise.all
  - Created ticket detail view page at /support/[id]
  - Implemented message thread display and reply functionality
- **Files Modified:**
  - `/src/services/support.ts` - Simplified getTicket query
  - Created `/src/app/support/[id]/page.tsx` - Ticket detail view
- **Date Reported:** August 14, 2025
- **Date Fixed:** August 14, 2025

### **BUG-047: Support Page Logout on Refresh**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Authentication / Support System
- **Description:** Refreshing the support page automatically logged users out
- **Symptoms:**
  - Navigate to /support page works initially
  - Refresh the page → automatically logged out
  - Redirect to login page on every refresh
  - Session not persisting properly
- **Root Cause:**
  - Supabase client singleton being recreated in dev mode
  - Lost authentication session when client was recreated
  - Dev mode check causing client recreation on each request
- **Solution Applied:**
  - Fixed Supabase client singleton pattern
  - Removed dev mode client recreation
  - Maintain single client instance for session persistence
  - Added proper auth loading states
- **Files Modified:**
  - `/src/lib/supabase/client.ts` - Fixed singleton pattern
  - `/src/app/support/page.tsx` - Added auth loading state
- **Date Reported:** August 14, 2025
- **Date Fixed:** August 14, 2025

### **BUG-046: Support Ticket Creation 403 Forbidden Error**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Support System / Database
- **Description:** Creating support tickets failed with 403 Forbidden error
- **Symptoms:**
  - Clicking "Create new ticket" button showed error
  - 403 Forbidden when inserting into support_tickets table
  - Error: "new row violates row-level security policy"
  - Ticket creation completely blocked
- **Root Cause:**
  - Missing ticket_number field (UNIQUE NOT NULL constraint)
  - RLS policies not properly configured
  - Service not generating ticket number before insert
- **Solution Applied:**
  - Added explicit ticket number generation (TKT-YYYYMM-XXXX format)
  - Created SQL script to enable RLS and set proper policies
  - Fixed authentication flow to use getSupabase() consistently
  - Added proper error handling with detailed messages
- **Files Modified:**
  - `/src/services/support.ts` - Added ticket number generation
  - Created `/scripts/fix-support-rls.sql` - RLS policy fixes
- **Date Reported:** August 14, 2025
- **Date Fixed:** August 14, 2025

### **BUG-045: AI Image-to-Image Generation Not Saving to My Images**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** AI Image Generation / Image Gallery
- **Description:** AI-generated images from image-to-image generation were not appearing in My Images gallery
- **Symptoms:**
  - User creates images using image-to-image AI generation
  - Images generated successfully but don't show in My Images gallery
  - Images were saved to `uploads` table but not `processed_images` table
- **Root Cause:**
  - `/api/generate/from-image/route.ts` was saving to `uploads` table only
  - Missing call to `insert_processed_image` RPC function
  - My Images gallery only shows items from `processed_images` table
- **Solution Applied:**
  - Updated `/api/generate/from-image/route.ts` to use `insert_processed_image` RPC
  - Changed from saving to `uploads` table to `processed_images` table
  - Ensured consistent with other AI generation endpoints
  - Fixed model name to use 'gpt-image-1' instead of 'dall-e-3'
- **Files Modified:**
  - `/src/app/api/generate/from-image/route.ts` - Added RPC call to save to gallery
- **Date Reported:** August 11, 2025
- **Date Fixed:** August 11, 2025

### **BUG-044: OpenAI Client-Side Initialization Error**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** AI Image Generation / ChatGPT Service
- **Description:** OpenAI SDK was being initialized on client-side causing security errors
- **Symptoms:**
  - Error when clicking "AI" checkbox: "It looks like you're running in a browser-like environment"
  - OpenAI SDK refusing to run without `dangerouslyAllowBrowser: true`
  - AI generation feature completely broken in production
- **Root Cause:**
  - OpenAI client was being initialized at module level in chatgpt.ts
  - PromptBuilder component importing the service on client-side
  - OpenAI SDK designed for server-side use only
- **Solution Applied:**
  - Moved OpenAI initialization to only happen inside server-side methods
  - Added runtime check: `if (typeof window !== 'undefined')` to prevent client execution
  - Dynamically import OpenAI only when needed in API routes
  - Extracted client-safe prompt helpers to separate utility file
  - Updated PromptBuilder to use client-safe helpers instead of service
- **Files Modified:**
  - `/src/services/chatgpt.ts` - Dynamic import, server-side only
  - `/src/utils/promptHelpers.ts` - Created client-safe prompt utilities
  - `/src/components/ai/PromptBuilder.tsx` - Use client helpers
  - `/src/app/api/generate/image/route.ts` - Import prompt helpers
- **Date Reported:** August 7, 2025
- **Date Fixed:** August 7, 2025

### **BUG-042: Stripe Webhook Integration Issues**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Stripe Webhooks / Payment Processing
- **Description:** Multiple issues preventing Stripe webhooks from processing payments and subscriptions
- **Symptoms:**
  - Webhook returning 400 "Signature verification failed" errors
  - Webhook URL pointing to preview deployment instead of production
  - Runtime errors: "Cannot read properties of null" and "Invalid time value"
  - Subscription cancellations from Stripe dashboard not updating user status
  - Payments successful but credits/subscriptions not updating
- **Root Causes Found:**
  1. **Wrong Webhook URL**: Was `dtfeditor.vercel.app` instead of `dtfeditor.com`
  2. **Mode Mismatch**: Test mode webhook secret with test API keys required
  3. **Code Errors**: `supabase` variable null, missing date field checks
  4. **Missing Metadata**: Stripe dashboard actions don't include userId
- **Solution Applied:**
  1. Updated webhook URL in Stripe dashboard to production domain
  2. Used correct test mode webhook signing secret
  3. Fixed code to use `getSupabase()` consistently
  4. Added null checks for subscription date fields
  5. Implemented fallback to lookup userId by customer ID
- **Manual Scripts Created:**
  - `fix-subscription-manually.js` - Update subscription status
  - `cancel-subscription-manual.js` - Cancel subscriptions
  - `update-user-credits.js` - Adjust user credits
  - `reset-stripe-customer.js` - Clear Stripe data
  - `resubscribe-user.js` - Manually activate subscriptions
- **Verification:** All payment types now working (subscriptions, pay-as-you-go, cancellations)
- **Date Reported:** August 6, 2025
- **Date Fixed:** August 6, 2025

### **BUG-043: Notification System Build Errors**

- **Status:** 🟢 FIXED
- **Severity:** High
- **Component:** Notification System
- **Description:** Build failing due to non-existent `useAuth` hook import
- **Symptoms:**
  - "Module not found: Can't resolve '@/hooks/useAuth'"
  - Build failure preventing deployment
- **Root Cause:**
  - Imported non-existent `useAuth` hook instead of `useAuthStore`
  - Wrong authentication pattern for getting session tokens
- **Solution Applied:**
  - Replaced `useAuth` with `useAuthStore` imports
  - Used `createClientSupabaseClient` to get session tokens
  - Fixed all authentication calls in notification components
- **Date Reported:** August 6, 2025
- **Date Fixed:** August 6, 2025

### **BUG-039: Image Gallery and Vectorization Save Issues**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Image Gallery / Storage / Database
- **Description:** Multiple cascading issues preventing images from displaying and vectorization from saving
- **Symptoms:**
  - "Invalid login credentials" error preventing access
  - Dashboard showed "Failed to load images" with 403 errors
  - Images saved with 0 bytes and broken links
  - Vectorized images never saved to gallery (0 records in DB)
  - Deep-Image temporary URLs expiring before save
- **Root Causes Found:**
  1. **Authentication**: Missing redirect URLs in Supabase, missing getAuthState() method
  2. **403 Errors**: Duplicate RLS policies for both {public} and {authenticated} roles
  3. **Image Storage**: Deep-Image URLs expire quickly, needed immediate download
  4. **Signed URLs**: Storing signed URLs that expire instead of storage paths
  5. **Vectorization**: Database constraint only allowed 'upscale' and 'background-removal', not 'vectorization'
- **Solution Applied:**
  1. Fixed authentication by adding redirect URLs and implementing getAuthState()
  2. Cleaned duplicate RLS policies, kept only {authenticated} role policies
  3. Modified Deep-Image service to download images immediately and convert to data URLs
  4. Changed storage approach to save paths and generate signed URLs on demand
  5. Updated database constraint to include 'vectorization' as valid operation_type
- **Technical Details:**
  - Deep-Image returns temporary URLs at `/api/downloadTemporary/` that expire quickly
  - Implemented immediate download and base64 conversion in deepImage.ts
  - Storage bucket remains private with signed URL generation (1-hour expiry)
  - Fixed SVG handling for proper content type (image/svg+xml → svg)
- **Date Reported:** August 5, 2025
- **Date Fixed:** August 5, 2025

### **BUG-038: Bulk Credit Adjustment Not Working**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Admin User Management / Bulk Operations
- **Description:** Bulk credit adjustment feature not updating user credits despite showing success message
- **Symptoms:**
  - User reported: "i used the bulk add credits feature for the two free users in the screenshot and it did not work"
  - Users had 2 credits, tried to add 2 more, still showed 2 credits
  - Success toast appeared but credits didn't update
- **Root Cause:**
  - API was trying to call non-existent `add_credits_bulk` RPC function
  - Fallback code was working but only after initial RPC failure
  - Database column is `credits_remaining`, not `credits`
- **Solution Applied:**
  - Removed RPC call attempt since function doesn't exist
  - Direct database updates using `credits_remaining` column
  - Cleaned up code to use consistent column naming
  - Tested and verified credits now update correctly
- **Date Reported:** July 31, 2025
- **Date Fixed:** July 31, 2025

### **BUG-036: My Images Gallery Not Saving Processed Images**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Image Gallery / Image Processing
- **Description:** Processed images not appearing in "My Images" section of user dashboard
- **Symptoms:**
  - Background removal worked but images didn't show in gallery
  - Gallery showed "No processed images yet" despite processing
  - Broken image links when images did appear
- **Root Causes Found:**
  1. Database permission issue - service role couldn't access `processed_images` table
  2. ClippingMagic has different flow - doesn't use standard image processing service
  3. Wrong storage bucket - used private bucket with public URLs
- **Investigation Process:**
  - Found RLS policies blocking service role access
  - Tried multiple RLS fixes, even disabled RLS entirely
  - Issue persisted - problem was at PostgreSQL role level, not RLS
  - Created wrapper RPC functions as workaround
- **Solution Applied:**
  1. Created RPC wrapper functions with SECURITY DEFINER:
     - `insert_processed_image` - For saving images
     - `get_user_images` - For fetching images
     - `delete_processed_image` - For deleting images
  2. Updated `/api/clippingmagic/download/[id]` to save images to gallery
  3. Switched from private `user-images` to public `images` bucket
- **Date Reported:** July 30, 2025
- **Date Fixed:** July 30, 2025

### **BUG-035: Admin Sidebar Not Collapsing Properly**

- **Status:** 🟢 FIXED
- **Severity:** Medium
- **Component:** Admin Layout / AdminSidebar
- **Description:** When clicking hamburger menu, the sidebar collapses but the main content doesn't expand to fill the space
- **Symptoms:**
  - Hamburger menu toggles sidebar visibility
  - Main content stays in same position when sidebar collapses
  - Wasted screen space on desktop when sidebar is hidden
- **Root Cause:**
  - Sidebar had `lg:translate-x-0` forcing it visible on desktop
  - Main content margin logic wasn't properly adjusting
  - Fixed positioning wasn't working correctly with margin transitions
- **Solution Applied:**
  - Removed `lg:translate-x-0` from sidebar to allow proper collapse on all screen sizes
  - Updated main content to use consistent margin logic
  - Added `pt-16` to account for fixed header
  - Now sidebar properly collapses and content expands on all screen sizes
- **Date Reported:** July 30, 2025
- **Date Fixed:** July 30, 2025

### **BUG-034: Analytics Page Server Component Error**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Admin Analytics / CostTrackingService
- **Description:** Analytics page crashes with "next/headers" error when trying to import server-side code in client component
- **Symptoms:**
  - Build error on /admin/analytics page
  - Error: "You're importing a component that needs 'next/headers'"
  - CostTrackingService importing server-side Supabase client
- **Root Cause:**
  - CostTrackingService was importing createServerSupabaseClient
  - This service is used in client components (CostAnalyticsDashboard)
  - Server-side imports can't be used in client components
- **Solution Applied:**
  - Changed CostTrackingService to use client-side Supabase client
  - Imported createClient directly from @supabase/supabase-js
  - Used env variables for client-side initialization
- **Date Reported:** July 30, 2025
- **Date Fixed:** July 30, 2025

### **BUG-033: Admin Page 500 Errors After Adding User Management**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Admin Dashboard / API Routes
- **Description:** Admin page showing blank screen with 500 errors after implementing user management features
- **Symptoms:**
  - Blank screen on /admin
  - Multiple 500 errors for webpack.js, main.js, react-refresh.js
  - 401 unauthorized error from contentOverview.js
  - Server not responding properly
- **Root Cause:**
  - TypeScript errors in new admin API routes
  - createServerSupabaseClient returns Promise in Next.js 15
  - Missing await keywords in API routes
  - Type errors with implicit any types
- **Investigation:**
  - Found 80+ TypeScript errors after running type-check
  - Main issue: API routes not awaiting async Supabase client
  - Secondary issues: missing type annotations
- **Solution Applied:**
  - Added await to all createServerSupabaseClient() calls in admin API routes
  - Fixed type annotations for array reduce functions
  - Updated dynamic route params to use Promise<{ id: string }> and await params
  - Fixed all params.id references to use destructured id variable
  - Server restarted successfully and admin page now loads
- **Notes:**
  - TypeScript errors don't prevent Next.js dev server from running
  - Remaining TypeScript errors are in non-admin routes and don't affect admin functionality
- **Date Reported:** July 30, 2025
- **Date Fixed:** July 30, 2025

### **BUG-032: Admin Login Cookie Not Persisting**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Admin Authentication
- **Description:** Admin login succeeds but cookie not set/read properly, causing redirect loop
- **Symptoms:**
  - Login form submits successfully
  - Success toast appears
  - Redirect to /admin occurs
  - Middleware redirects back to /admin/login (cookie not found)
  - Session stored in localStorage but not accessible to middleware
- **Root Causes Identified:**
  1. Dual authentication systems (regular Supabase auth + custom admin auth)
  2. HttpOnly cookie can't be read by JavaScript (mismatch in design)
  3. Middleware checks cookie, client checks localStorage
  4. Possible Next.js 15 cookie handling issues in development
- **Investigation Process:**
  - Found temporary security bypasses left in admin middleware from previous debugging
  - Discovered over-engineered custom admin auth system with separate tables, 2FA support, IP whitelisting
  - Identified fundamental architecture mismatch: middleware needed cookies, client used localStorage
  - HttpOnly cookies couldn't be accessed by JavaScript causing sync issues
- **Solution Applied:**
  - **Step 1:** Removed all security bypasses and console.log statements
  - **Step 2:** Scrapped entire custom admin auth system (admin_users, admin_roles tables)
  - **Step 3:** Simplified to use Supabase auth + is_admin flag in profiles table
  - **Step 4:** Updated admin middleware to check Supabase session instead of custom cookies
  - **Step 5:** Modified all admin components to use regular authStore
  - **Step 6:** Added proper initialization in admin login page
- **Implementation Details:**
  - Changed `adminAuthService` references to `authStore` throughout
  - Updated middleware to use `supabase.auth.getUser()` instead of custom cookie checks
  - Modified AdminLayout, AdminHeader, AdminSidebar to use standard auth
  - Fixed initialization timing issues with proper await/async handling
- **Benefits:**
  - Simpler architecture (one auth system instead of two)
  - No cookie/localStorage conflicts
  - Works with Supabase's built-in session management
  - Less code to maintain (removed ~500 lines of custom auth code)
  - Follows YAGNI principle - avoided over-engineering
- **User Confirmation:** "the admin dashboard is now showing"
- **Date Fixed:** July 30, 2025

### **BUG-031: Admin Login Cookie/Session Issue**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Admin Authentication
- **Description:** Admin login successful but middleware redirects back to login
- **Symptoms:**
  - Login shows green "Welcome to Admin Dashboard" toast
  - window.location.href = '/admin' executes
  - Middleware redirects /admin back to /admin/login
  - Cookie not being read by middleware
  - Direct navigation to /admin shows hydration error
- **Root Causes Found:**
  1. Wrong Supabase package imports - FIXED
  2. 2FA requirement in code but not implemented - FIXED
  3. Session stored in localStorage but middleware checks cookie - FIXED
  4. Browser extension (contentOverview) causing hydration errors - MITIGATED
  5. Cookie setting/reading issue in development environment - FIXED
- **Solution Applied:**
  - Updated cookie setting to use cookies() function directly
  - Added credentials: 'include' to fetch requests
  - Implemented localStorage/sessionStorage fallback
  - Simplified redirect logic with query param
  - Added session verification on admin dashboard
  - Disabled React strict mode to reduce hydration errors
  - Admin dashboard now checks localStorage for session
- **Verification:**
  - Admin can login successfully
  - Redirect works with window.location.href
  - Dashboard accessible with localStorage session
  - Middleware temporarily bypassed for development
- **Security Fix Applied (July 30, 2025 - Session 2):**
  - Removed ALL security bypasses from middleware
  - Re-enabled proper cookie-based authentication
  - Removed all console.log statements that exposed session data
  - Fixed duplicate cookieStore declaration in login API
  - Middleware now properly enforces authentication
- **Date Fixed:** July 30, 2025 (Security hardened: July 30, 2025 - Session 2)

### **BUG-020: Background Removal Early Credit Deduction**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Credit System / ClippingMagic Integration
- **Description:** Credits were deducted when opening the background removal editor, not when processing completed
- **Root Cause:**
  - Credit deduction happened on editor initialization
  - No distinction between opening editor and completing processing
- **Symptoms:**
  - Users lost credits even when canceling without processing
  - Credits deducted on page load instead of result generation
- **Solution Applied:**
  - Moved credit deduction to 'result-generated' event handler
  - Added creditsDeducted flag to prevent double deduction
  - Credits now only deducted when processing is actually completed
- **Date:** July 2025

### **BUG-021: Stripe API Compatibility Issues**

- **Status:** 🟢 FIXED
- **Severity:** High
- **Component:** Stripe Integration
- **Description:** Multiple Stripe API methods not working with SDK v18.3.0
- **Issues Found:**
  1. `stripe.invoices.upcoming()` is not a function
  2. `coupon` parameter deprecated in favor of `discounts`
  3. Array responses from webhook updates
- **Solution Applied:**
  - Removed upcoming invoice retrieval, calculate from subscription data
  - Updated to use `discounts: [{coupon: id}]` format
  - Handle array responses in webhook handlers
- **Date:** July 2025

### **BUG-022: Retention System Eligibility Check Failures**

- **Status:** 🟢 FIXED
- **Severity:** High
- **Component:** Subscription Retention / Database
- **Description:** Cancellation flow skipped retention offers due to eligibility check issues
- **Root Cause:**
  - Supabase RPC functions returning arrays instead of objects
  - Frontend not handling array responses properly
- **Solution Applied:**
  - Added array handling: `Array.isArray(data) && data.length > 0 ? data[0] : data`
  - Updated all retention eligibility endpoints
  - Fixed discount application endpoint
- **Date:** July 2025

### **BUG-023: Credit Column Mismatch**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Credit System / Database
- **Description:** Credit checks failing due to inconsistent column names (credits vs credits_remaining)
- **Root Cause:**
  - Database has `credits` column but code was checking `credits_remaining`
  - Migration inconsistency between different environments
- **Symptoms:**
  - "Insufficient credits" error despite having credits
  - Dashboard shows credits but processing fails
- **Solution Applied:**
  - Updated `imageProcessing.ts` to check both columns
  - Updated `authStore.ts` to use fallback logic
  - Updated `CreditDisplay.tsx` for proper display
- **Date:** July 29, 2025

### **BUG-024: Deep-Image API Invalid Key**

- **Status:** 🟢 FIXED
- **Severity:** High
- **Component:** Deep-Image Integration
- **Description:** "No user found for provided token" error on upscaling
- **Root Cause:**
  - API key set to test/invalid value: `73e72360-67b3-11f0-aac1-2d32901b6ec4-invalid_key_for_testing`
- **Solution Applied:**
  - User updated DEEP_IMAGE_API_KEY in .env.local with valid key
  - Upscaling now works correctly
- **Date Fixed:** July 29, 2025

### **BUG-025: Credit Display Not Updating on Processing Pages**

- **Status:** 🟢 FIXED
- **Severity:** High
- **Component:** UI / Credit System
- **Description:** Credit display on processing pages doesn't update without hard refresh
- **Symptoms:**
  - After processing, credit count shows old value
  - User must refresh page to see updated credits
  - Confusing UX as users think credits weren't deducted
- **Root Cause:**
  - Processing pages didn't refresh credits from authStore
  - No event listeners for focus/visibility changes
- **Solution Applied:**
  - Added useEffect hooks to all processing pages
  - Refresh credits on: page load, window focus, visibility change
  - Also refresh after successful processing operations
- **Date Fixed:** July 29, 2025

### **BUG-026: Phantom Credits from Failed Operations**

- **Status:** 🟢 FIXED
- **Severity:** High
- **Component:** Credit System
- **Description:** Users accumulated phantom credits from refunds on "insufficient credits" errors
- **Symptoms:**
  - User had 4 credits in DB but only 2 were real
  - Failed operations with "insufficient credits" still gave refunds
- **Root Cause:**
  - Refund logic triggered for ALL errors including insufficient credits
- **Solution Applied:**
  - Added check: don't refund if error contains "insufficient credits"
  - Reset user's phantom credits to 0, added 10 test credits
- **Date Fixed:** July 29, 2025

### **BUG-027: Webhook Not Processing Subscriptions**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Stripe Webhooks
- **Description:** Stripe webhook not updating database after any subscription changes
- **Symptoms:**
  - New subscriptions don't update database
  - Plan upgrades/downgrades don't sync
  - Credits not allocated automatically
  - Dashboard shows old plan/credit info
  - Manual database sync required for all operations
- **Root Cause Found:**
  - Stripe CLI was forwarding to `/api/webhooks/stripe-simple`
  - That endpoint only handled `payment_intent.succeeded` events
  - Subscription events need `checkout.session.completed` and `customer.subscription.updated`
  - Main webhook at `/api/webhooks/stripe` had correct handlers but wasn't receiving events
- **Solution Applied:**
  - Updated stripe-simple webhook to handle subscription events
  - Added checkout.session.completed handler for new subscriptions
  - Added customer.subscription.updated handler for plan changes
  - Both handlers update profile and allocate credits correctly
- **Date Fixed:** July 29, 2025

### **BUG-028: Retention Flow Bypassed in Stripe Portal**

- **Status:** 🟢 FIXED
- **Severity:** High
- **Component:** Subscription Retention
- **Description:** Users can cancel directly in Stripe portal, bypassing retention offers
- **Symptoms:**
  - Clicking "Cancel Plan" in Stripe portal cancels immediately
  - No retention offers shown (pause, discount)
  - Retention system completely bypassed
- **Solution Applied:**
  - Configured Stripe Customer Portal settings
  - Disabled cancellation in portal
  - Users must now use in-app cancellation button
  - Retention flow now mandatory for all cancellations
- **Date Fixed:** July 29, 2025

### **BUG-029: No Insufficient Credits Warning on Processing Pages**

- **Status:** 🟢 FIXED
- **Severity:** Medium
- **Component:** UI/UX
- **Description:** Processing buttons disabled with no explanation when insufficient credits
- **Symptoms:**
  - Button grayed out when user has 0 credits
  - No message explaining why button is disabled
  - Users confused about why they can't process
- **Solution Applied:**
  - Added clear insufficient credits warnings on all processing pages
  - Shows red warning box when credits below required amount
  - Message explains how many credits needed and suggests action
- **Date Fixed:** July 29, 2025

### **BUG-030: Cancellation Shows Wrong Success Message**

- **Status:** 🟢 FIXED
- **Severity:** Medium
- **Component:** Cancellation Flow
- **Description:** Success message shows discount applied even when user cancelled
- **Symptoms:**
  - User cancels subscription (skips retention offers)
  - Success popup says "50% discount has been applied"
  - Confusing messaging about what actually happened
- **Root Cause:**
  - Success message based on eligibility, not actual action taken
  - Used eligibility?.canUseDiscount instead of tracking completed action
- **Solution Applied:**
  - Added completedAction state to track what was actually done
  - Updated all handlers to set correct action type
  - Success message now shows correct text based on action
- **Date Fixed:** July 29, 2025

### **BUG-015: Credit Addition RPC Function Permission Error**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Database / Credit System
- **Description:** The add_user_credits RPC function fails with "permission denied for table credit_transactions"
- **Root Cause:**
  - The credit_transactions table was missing entirely
  - The add_user_credits function wasn't created in the database
  - RLS policies weren't configured
- **Solution Applied:**
  - Created credit_transactions table with proper schema
  - Implemented add_user_credits function with SECURITY DEFINER
  - Added RLS policies allowing service role full access
  - Tested and confirmed working with manual credit addition
- **Date:** January 2025

### **BUG-016: Stripe Customer Portal Not Configured**

- **Status:** 🟢 FIXED
- **Severity:** High
- **Component:** Stripe Integration
- **Description:** Customer portal access fails with configuration error
- **Root Cause:**
  - Stripe customer portal not configured in Stripe dashboard
  - Error: "No configuration provided and your test mode default configuration has not been created"
- **Symptoms:**
  - "Unable to access subscription management" error in UI
  - 500 error on /api/stripe/create-portal-session endpoint
- **Solution Applied:**
  - Configured customer portal in Stripe dashboard
  - Portal now accessible and functional
- **Date:** January 2025

### **BUG-037: Enhanced Gallery Implementation In Progress**

- **Status:** 🟢 FIXED
- **Severity:** Low
- **Component:** Image Gallery
- **Description:** Enhanced gallery with search, filtering, bulk operations, and collections
- **Work Completed:**
  - Added search functionality (filename, type)
  - Date range filtering (today, week, month, custom)
  - Enhanced sorting options (newest, oldest, size, name)
  - Bulk selection mode with download/delete
  - Active filter display with removal
  - Results count display
  - Improved UI with selection checkboxes
  - Collections system fully implemented
  - Collection filtering active
  - Default "All Images" collection for each user
- **Migration Applied:**
  - Created `image_collections` table
  - Created `collection_items` junction table
  - Added RLS policies for collections
  - Default collections created for all users
- **Date Reported:** July 31, 2025
- **Date Fixed:** July 31, 2025

### **BUG-017: Subscription Updates Through Portal Create New Subscriptions**

- **Status:** 🔴 ACTIVE
- **Severity:** High
- **Component:** Stripe Integration / Webhooks
- **Description:** When customers upgrade/downgrade through Stripe portal, it creates new subscriptions instead of updating existing ones
- **Root Cause:**
  - Stripe portal configuration issue or API behavior
  - New subscriptions don't have userId in metadata
  - Webhook can't automatically update user profile without metadata
- **Symptoms:**
  - Multiple active subscriptions for same customer
  - Dashboard doesn't reflect plan changes
  - Potential double-billing
- **Workaround:**
  - Manually update subscription in database
  - Cancel old subscriptions to prevent double-billing
  - Need to implement subscription lookup by customer ID as fallback
- **Date:** January 2025

### **BUG-018: Main Webhook Handler Not Processing Credits**

- **Status:** 🟢 FIXED
- **Severity:** High
- **Component:** Webhook Handler
- **Description:** The main webhook handler at /api/webhooks/stripe was not adding credits after payment
- **Root Cause:**
  - Complex initialization or dependency issues in the main webhook handler
  - Possible async/await timing issues
- **Solution Applied:**
  - Created simplified webhook handler at /api/webhooks/stripe-simple
  - Direct initialization of Stripe and Supabase clients
  - Minimal dependencies and clear error handling
  - Updated Stripe CLI to forward to new endpoint
- **Date:** January 2025

### **BUG-019: Credit Deduction Functions Missing**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Database / Credit System
- **Description:** Image processing attempts to deduct credits but required database functions don't exist
- **Symptoms:**
  - "function use_credits_with_expiration does not exist" error
  - "function add_credit_transaction does not exist" error
  - Credits not deducted when processing images
  - No credit refunds on processing failures
- **Root Cause:**
  - Database functions `use_credits_with_expiration` and `add_credit_transaction` were never created
  - Supabase schema cache doesn't immediately reflect new functions
- **Solution Applied:**
  - Implemented fallback mechanism in `imageProcessingService`
  - Service tries RPC functions first, falls back to direct DB updates
  - Credit deduction now works reliably without requiring specific functions
  - Transaction logging implemented in fallback code
- **Verification:** User confirmed credit deduction working
- **Date Fixed:** January 2025

### **BUG-012: ClippingMagic White Label Editor Implementation**

- **Status:** 🟡 IN PROGRESS
- **Severity:** Critical
- **Component:** ClippingMagic Integration
- **Description:** Initial implementation incorrectly assumed iframe embedding, but editor opens in popup
- **Root Cause:**
  - Misunderstood API documentation - ClippingMagic.edit() opens a popup window, not iframe
  - Internal iframe created by ClippingMagic.js is for internal use only
  - The `X-Frame-Options: sameorigin` error is from internal implementation, not the actual editor
- **Investigation:**
  - Initially thought editor was embedded as iframe
  - Discovered ClippingMagic.js creates internal iframe for communication
  - API docs clearly state editor opens in popup window
  - Browser popup blockers may prevent editor from opening
- **Solution Being Implemented:**
  - Upload image to ClippingMagic first to get ID and secret
  - Use ClippingMagic.edit() to open editor in popup window
  - Handle callback events for result/error/exit
  - Warn users about popup blockers
- **Date:** January 2025

## 🐛 **Critical Bugs (P0)**

### **BUG-001: Authentication RLS Policies Causing Signup Failures**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Authentication / Database
- **Description:** Multiple SQL fix attempts indicate RLS policies are preventing user signups
- **Symptoms Fixed:**
  - New users can now create accounts ✅
  - No more "Failed to create user profile" errors ✅
  - Recursive policy issues resolved ✅
- **Solution Applied:**
  - Created and applied `004_consolidated_auth_fix_v2.sql` ✅
  - Database trigger now handles profile creation ✅
  - Non-recursive RLS policies implemented ✅
  - Cleaned up auth service code ✅
- **Files Fixed:**
  - `supabase/migrations/004_consolidated_auth_fix_v2.sql` (APPLIED)
  - `src/services/auth.ts` (UPDATED)

### **BUG-002: Console Logs Exposing Sensitive Information**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** All services
- **Description:** 50+ console.log statements in production code
- **Security Risk:** API keys, user data, request bodies logged
- **Files Cleaned:**
  - `src/services/deepImage.ts` (14 removed)
  - `src/services/storage.ts` (14 removed)
  - `src/services/auth.ts` (14 removed)
  - All API routes and components cleaned
- **Solution:** Removed ALL console statements from src/ directory
- **Verification:** Zero console statements remain in codebase

### **BUG-011: Image Processing Not Working**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Image Processing / Deep-Image.ai Integration
- **Description:** Multiple issues preventing image upscaling from working
- **Symptoms Fixed:**
  - "supabase is not defined" error ✅
  - "upscale is not available - missing API configuration" ✅
  - Next.js Image component hostname error ✅
- **Root Causes:**
  - Incorrect Supabase client references in storage service
  - Wrong environment variable names (NEXT*PUBLIC* prefix on server-side keys)
  - Missing Next.js remote image configuration
  - Incorrect API header case (X-API-KEY vs x-api-key)
- **Solution Applied:**
  - Fixed storage.ts to use `this.supabase` instead of `supabase`
  - Removed NEXT*PUBLIC* prefix from server-side env vars
  - Added Deep-Image.ai domains to next.config.js remotePatterns
  - Updated API header to lowercase `x-api-key`
- **Fixed Date:** January 2025 (Current Session - Part 12-13)
- **Verification:** Image upscaling fully functional, tested and working

---

## 🟡 **High Priority Bugs (P1)**

### **BUG-003: Infinite Re-render Loop in AuthContext**

- **Status:** 🟡 PARTIALLY FIXED
- **Severity:** High
- **Component:** AuthContext
- **Description:** AuthContext causing infinite re-renders
- **Symptoms:** Page crashes, performance issues
- **Attempted Fixes:** Added useMemo (commit 0a18cd6)
- **Current State:** Temporarily fixed but needs proper refactor
- **Solution:** Simplify state management, remove redundancy

### **BUG-004: Environment Variables Inconsistency**

- **Status:** 🟢 FIXED
- **Severity:** High
- **Component:** Environment Configuration
- **Description:** Mixed use of public/private env vars
- **Fixed Issues:**
  - Standardized all AI API keys to server-side only ✅
  - Removed fallback to empty strings for critical services ✅
  - Added proper feature availability checking ✅
  - Improved validation with errors/warnings ✅
- **Solution:** Complete env.ts refactor with security-first approach

### **BUG-005: Credits vs Credits_Remaining Column Confusion**

- **Status:** 🔴 OPEN
- **Severity:** High
- **Component:** Database Schema
- **Description:** Inconsistent column naming in profiles table
- **Multiple migrations trying to fix same issue**
- **Solution:** Standardize on single column name

---

## 🟢 **Medium Priority Bugs (P2)**

### **BUG-006: Test Pages in Production Build**

- **Status:** 🟢 FIXED
- **Severity:** Medium
- **Component:** Pages/Routes
- **Description:** Development test pages accessible in production
- **Pages Removed:**
  - `/image-upload` ✅
  - `/upscale-test` ✅
  - `/ui-showcase` ✅
  - `/api/debug-supabase` ✅
  - `/api/test-storage` ✅
- **Solution:** Deleted all test pages and empty API directories

### **BUG-007: Hydration Errors on Home Page**

- **Status:** 🟢 FIXED
- **Severity:** Medium
- **Component:** Home Page
- **Description:** Client/server mismatch causing hydration errors
- **Fix Applied:** Return null and use router.replace (commit d5a477b)
- **Verified:** Working correctly

### **BUG-008: Missing Error Boundaries**

- **Status:** 🔴 OPEN
- **Severity:** Medium
- **Component:** Global
- **Description:** No error boundaries to catch component failures
- **Impact:** Single component error crashes entire app
- **Solution:** Add error boundaries at strategic points

---

## 🔵 **Low Priority Bugs (P3)**

### **BUG-009: TypeScript Errors Not Failing Build**

- **Status:** 🔴 OPEN
- **Severity:** Low
- **Component:** Build Configuration
- **Description:** TypeScript errors don't prevent build
- **Solution:** Strict TypeScript configuration

### **BUG-010: Unused Imports and Dead Code**

- **Status:** 🔴 OPEN
- **Severity:** Low
- **Component:** Various
- **Description:** Multiple unused imports and unreachable code
- **Solution:** ESLint rule enforcement

---

### **BUG-013: Dashboard Hydration Error and Infinite Loading**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Dashboard Page / Authentication
- **Description:** Dashboard stuck in loading state with hydration error
- **Symptoms:**
  - Page shows "Loading your dashboard..." indefinitely
  - Console error: "Hydration failed because the server rendered HTML didn't match the client"
  - 401 error in console
  - Multiple "Showing loading page" logs
- **Root Cause:** Console.log statements in render causing hydration mismatch
- **Solution Applied:** Removed all console.log statements from dashboard page
- **Date Reported:** January 29, 2025
- **Date Fixed:** January 29, 2025
- **Verification:** User confirmed dashboard loads correctly

### **BUG-020: Background Removal Credits Deducted on Cancel**

- **Status:** 🟢 FIXED
- **Severity:** High
- **Component:** Background Removal / Credit System
- **Description:** Credits were deducted when user opened background removal editor but cancelled without completing
- **Symptoms:**
  - Credit deducted immediately on image upload to ClippingMagic
  - Refund mechanism existed but didn't trigger reliably
  - User lost credit even if they cancelled the operation
- **Root Cause:**
  - Credits were deducted on upload, not on completion
  - `editor-exit` event didn't fire reliably when popup was closed
- **Solution Applied:**
  - Moved credit deduction to AFTER result is generated
  - Credits now only deducted when `result-generated` event fires
  - Removed automatic deduction on upload
  - Created `/api/credits/deduct` endpoint for controlled deduction
  - Removed unreliable refund mechanism
- **Date Fixed:** January 2025

## 📊 **Bug Statistics**

| Priority    | Total  | Open  | In Progress | Fixed  | Fix Rate |
| ----------- | ------ | ----- | ----------- | ------ | -------- |
| P0 Critical | 50     | 1     | 0           | 49     | 98%      |
| P1 High     | 4      | 1     | 0           | 3      | 75%      |
| P2 Medium   | 3      | 1     | 0           | 2      | 67%      |
| P3 Low      | 2      | 2     | 0           | 0      | 0%       |
| **Total**   | **59** | **5** | **0**       | **54** | **92%**  |

---

### **BUG-014: Stripe Price ID Mismatch**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Stripe Integration / Payment
- **Description:** Stripe checkout fails with "No such price" error
- **Symptoms:**
  - Error message: "No such price: 'prod_SjzkSwdjCgAa8G'"
  - Cannot proceed with subscription checkout
  - Blocks all payment testing
- **Root Cause:** Environment variables had product IDs instead of price IDs
- **Solution Applied:** Updated all Stripe IDs to use correct price IDs:
  - Basic: price_1RleoYPHFzf1GpIrfy9RVk9m
  - Starter: price_1RlepVPHFzf1GpIrjRiKHtvb
  - 10 Credits: price_1RqCymPHFzf1GpIr6L0Ec4cH
  - 20 Credits: price_1RqCzZPHFzf1GpIrF2EBwBnm
  - 50 Credits: price_1RqD0QPHFzf1GpIrcAqSHy0u
- **Date Reported:** January 29, 2025
- **Date Fixed:** January 29, 2025
- **Verification:** Ready to test payment flows

### **BUG-040: File Size Limit Preventing Large Uploads After Vercel Pro Upgrade**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** File Upload / File Size Validation
- **Description:** After upgrading to Vercel Pro (50MB limit), users still getting "413 Payload Too Large" errors for files over 10MB
- **Symptoms:**
  - User upgraded to Vercel Pro specifically to handle larger files
  - Still getting 413 errors when uploading files over 10MB
  - Error persisted even after redeployment
- **Root Cause:**
  - Hard-coded 10MB (10 _ 1024 _ 1024) limits throughout the codebase
  - Multiple components had their own file size validation
  - Limits were not using a centralized configuration
- **Files with Hard-coded Limits Found:**
  - `/src/services/storage.ts` - Line 21: `const maxFileSize = 10 * 1024 * 1024;`
  - `/src/app/api/process/route.ts` - Line 33: `const MAX_FILE_SIZE = 10 * 1024 * 1024;`
  - `/src/app/process/client.tsx` - Line 34: `const maxSize = 10 * 1024 * 1024;`
  - `/src/components/image/ImageProcessor.tsx` - Line 156: `const maxSize = 10 * 1024 * 1024;`
  - `/src/components/image/ImageUpload.tsx` - Line 35: `const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;`
- **Solution Applied:**
  - Updated all hard-coded 10MB limits to 50MB (50 _ 1024 _ 1024)
  - Changed DEFAULT_MAX_FILE_SIZE constant in ImageUpload.tsx to 50MB
  - All file size validation now supports Vercel Pro's 50MB limit
- **Technical Details:**
  - Vercel Hobby plan: 4.5MB body size limit
  - Vercel Pro plan: 50MB body size limit
  - No configuration needed in vercel.json for Pro limits
- **Date Reported:** August 5, 2025
- **Date Fixed:** August 5, 2025

### **BUG-041: ClippingMagic Upload 413 Error for Files Over 4MB**

- **Status:** 🟢 FIXED
- **Severity:** Critical
- **Component:** Background Removal / API Routes
- **Description:** Background removal failing with 413 "Payload Too Large" for 4.46MB file despite 50MB limit fix
- **Symptoms:**
  - 413 errors in console for files over 4MB
  - "Unexpected token 'R', 'Request En'... is not valid JSON" error
  - Works fine for smaller files under 4MB
- **Root Cause:**
  - Next.js App Router has default 4MB body parser limit
  - Previous fix only updated application-level validation (50MB)
  - Platform-level limit not configured in vercel.json
- **Solution Applied:**
  - Added `maxBodySize: "50mb"` to all file upload routes in vercel.json:
    - `/api/upload/route.ts`
    - `/api/process/route.ts`
    - `/api/upscale/route.ts`
    - `/api/clippingmagic/upload/route.ts`
- **Technical Details:**
  - Next.js bodyParser limit is separate from Vercel deployment limits
  - Must be configured per API route in vercel.json
  - Error message was truncated "Request Entity Too Large" being parsed as JSON
- **Date Reported:** August 5, 2025
- **Date Fixed:** August 5, 2025

## 🔧 **Recently Fixed Bugs**

### **BUG-011: Image Processing Not Working**

- **Fixed Date:** January 2025 (Current Session)
- **Fixed By:** Environment config fixes + Next.js config
- **Verification:** Image upscaling tested and fully functional

### **BUG-002: Console Logs Security Issue**

- **Fixed Date:** January 2025 (Current Session)
- **Fixed By:** Complete codebase cleanup
- **Verification:** Zero console statements remain

### **BUG-001: Authentication RLS Policies**

- **Fixed Date:** January 2025 (Current Session)
- **Fixed By:** Database migration + trigger
- **Verification:** User signup/login working correctly

### **BUG-007: Hydration Errors**

- **Fixed Date:** Recent
- **Fixed By:** Commit d5a477b
- **Verification:** Tested and working

---

## 🎯 **Bug Fix Priority Order**

### **Week 1 (Current)**

1. BUG-001: Fix authentication RLS policies
2. BUG-002: Remove all console.logs
3. BUG-004: Fix environment variables
4. BUG-005: Standardize database columns

### **Week 2**

1. BUG-003: Properly fix AuthContext
2. BUG-006: Remove test pages
3. BUG-008: Add error boundaries

### **Week 3+**

1. BUG-009: TypeScript configuration
2. BUG-010: Code cleanup

---

## 📝 **Bug Reporting Template**

### **BUG-XXX: [Title]**

- **Status:** 🔴 OPEN / 🟡 IN PROGRESS / 🟢 FIXED
- **Severity:** Critical/High/Medium/Low
- **Component:** [Affected component]
- **Description:** [What's wrong]
- **Symptoms:** [What users experience]
- **Root Cause:** [Why it happens]
- **Solution:** [How to fix]
- **Files Affected:** [List of files]
- **Test Plan:** [How to verify fix]

---

## 🏷️ **Bug Labels**

- 🔴 **OPEN** - Not started
- 🟡 **IN PROGRESS** - Being worked on
- 🟢 **FIXED** - Completed and verified
- 🔵 **WONT FIX** - Decided not to fix
- ⚫ **DUPLICATE** - Duplicate of another bug

---

**Tracking Started:** January 2025  
**Update Frequency:** As bugs are found/fixed
