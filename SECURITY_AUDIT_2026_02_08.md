# DTF Editor - Complete Security & Code Audit Report

**Date:** February 8, 2026
**Auditor:** Claude Code (Automated)
**Scope:** Full codebase security audit, bug discovery, and action plan
**Total Issues Found:** 47

---

## Executive Summary

This audit uncovered **12 Critical**, **17 High**, **12 Medium**, and **6 Low** severity issues. The most alarming findings are:

1. **Unauthenticated credit injection** via debug endpoints that are deployed to production
2. **Missing authentication on Stripe checkout/payment endpoints** allowing any user to create payment flows for arbitrary user IDs
3. **Credit refund endpoint accessible to any authenticated user** with no authorization check
4. **Admin session cookies not httpOnly** making them stealable via any XSS
5. **Race conditions in credit deduction** allowing double-spending

**Immediate risk:** An attacker can currently grant themselves unlimited free credits through at least 3 different attack vectors without needing admin access.

---

## CRITICAL Severity (12 Issues) -- Fix Immediately

### SEC-001: Debug Endpoint Allows Unauthenticated Credit Injection
- **File:** `src/app/api/debug-credits/route.ts`, lines 70-128
- **Description:** POST `/api/debug-credits` accepts any `userId` and adds 5 credits with NO authentication. Rate limited at only 500 req/min (public).
- **Attack:** `curl -X POST /api/debug-credits -d '{"userId":"any-uuid"}'` = free credits
- **Fix:** Delete this file entirely.

### SEC-002: Debug Webhook Bypasses Stripe Signature Verification
- **File:** `src/app/api/webhooks/stripe/debug-route.ts`, lines 1-49
- **Description:** Parses raw body as JSON without Stripe signature verification, then calls `add_user_credits` with attacker-controlled metadata.
- **Attack:** Forge a webhook payload to inject unlimited credits into any account.
- **Fix:** Delete this file entirely.

### SEC-003: Checkout Session Missing User Authentication
- **File:** `src/app/api/stripe/create-checkout-session/route.ts`, lines 10-12
- **Description:** Accepts `userId` from client request body with zero authentication. No `getUser()` call.
- **Attack:** Create checkout sessions for any user, associate attacker's Stripe customer with victim's profile.
- **Fix:** Add `supabase.auth.getUser()`, verify authenticated user matches `userId`.

### SEC-004: Payment Intent Creation Missing Authentication
- **File:** `src/app/api/stripe/create-payment-intent/route.ts`, lines 9-85
- **Description:** Same as SEC-003. `userId` and `credits` come directly from untrusted client with no auth.
- **Attack:** Create payment intents for arbitrary users, manipulate credit amounts in metadata.
- **Fix:** Add authentication. Derive userId from session, credit count from server-side price mapping.

### SEC-005: Credit Refund Endpoint Has No Authorization
- **File:** `src/app/api/credits/refund/route.ts`, lines 1-81
- **Description:** Any authenticated user can POST with `{ "credits": 1000, "reason": "test" }` and get 1000 credits added to their balance. No check that a refund is actually owed.
- **Attack:** Call repeatedly to grant unlimited credits.
- **Fix:** Restrict to admin-only, or remove entirely (refunds should go through webhook handler).

### SEC-006: Admin Session Cookie httpOnly: false
- **File:** `src/app/api/admin/auth/login/route.ts`, line 141
- **Description:** `admin_session` cookie containing full session (access token, user ID, email, permissions) is readable by JavaScript. Comment says "Changed to allow JS access for debugging."
- **Attack:** Any XSS vulnerability = full admin account takeover.
- **Fix:** Set `httpOnly: true`. Use a separate non-sensitive flag cookie for client-side checks.

### SEC-007: Supabase Auth Token Cookie httpOnly: false
- **File:** `src/app/api/admin/auth/login/route.ts`, line 170
- **Description:** Custom `sb-auth-token` cookie exposes the Supabase access token to client JavaScript.
- **Attack:** XSS can steal the Supabase access token.
- **Fix:** Remove this cookie. Let `@supabase/ssr` manage its own cookies.

### SEC-008: Credit Reset Accepts Unverified stripe-signature as Auth
- **File:** `src/app/api/credits/reset/route.ts`, lines 14-21
- **Description:** The mere *presence* of a `stripe-signature` header bypasses the API key check. The signature is never verified.
- **Attack:** `curl -H "stripe-signature: anything" -X POST /api/credits/reset -d '{"userId":"target"}'`
- **Fix:** Either verify the signature properly or remove the stripe-signature check.

### SEC-009: Impersonation Cookie Forgery - Auth Bypass
- **Files:** `src/middleware/impersonation.ts`, `src/app/api/auth/effective-user/route.ts`, `src/lib/supabase/impersonation.ts`
- **Description:** The impersonation system trusts cookies without verifying the original admin is still authenticated. `getCurrentUser()` used throughout the app trusts impersonation cookie content.
- **Attack:** Steal/forge impersonation cookies to access any user's account.
- **Fix:** Always verify the current user has a valid admin session before honoring impersonation cookies.

### SEC-010: SSRF via User-Controlled URLs in Image Processing
- **Files:** `src/app/api/upscale/route.ts` (lines 81-83), `src/app/api/upscale-direct/route.ts` (lines 83-84), `src/app/api/analyze/image/route.ts` (lines 26-31)
- **Description:** `imageUrl` from user request is sent directly to server-side fetch/API calls with no validation.
- **Attack:** Supply `http://169.254.169.254/latest/meta-data/` to exfiltrate cloud credentials.
- **Fix:** Validate URLs against an allowlist of approved domains. Block private/internal IP ranges.

### SEC-011: Open Redirect in Affiliate Tracking
- **File:** `src/app/api/affiliate/track/route.ts`, lines 13, 82
- **Description:** `redirect` query parameter used directly in `NextResponse.redirect()`.
- **Attack:** Craft `/api/affiliate/track?ref=CODE&redirect=//evil.com` for phishing.
- **Fix:** Validate redirect starts with `/` and not `//`. Use allowlist of valid paths.

### SEC-012: Hardcoded ClippingMagic Credentials Exposed in Production
- **File:** `src/components/image/ImageProcessor.tsx`, lines 496-546
- **Description:** Debug section rendered unconditionally contains hardcoded API credentials: `id: 207794051, secret: 'g5rssaot702277tqfdpufdmqjtkc2u8j9h9t7fhro879csnbmtv'`.
- **Attack:** Anyone viewing page source can extract the API credentials.
- **Fix:** Remove the debug section or gate it behind `NODE_ENV === 'development'`.

---

## HIGH Severity (17 Issues) -- Fix This Week

### SEC-013: Race Condition in Credit Deduction (TOCTOU)
- **File:** `src/services/imageProcessing.ts`, lines 430-528
- **Description:** SELECT credits, check balance, then UPDATE. Two concurrent requests can both pass the check.
- **Fix:** Use atomic SQL: `UPDATE profiles SET credits_remaining = credits_remaining - $1 WHERE id = $2 AND credits_remaining >= $1`

### SEC-014: Duplicate Webhook Handlers - Double Credit Allocation Risk
- **Files:** `src/app/api/webhooks/stripe/route.ts`, `src/app/api/webhooks/stripe-simple/route.ts`
- **Description:** Both handle `checkout.session.completed` and add credits independently.
- **Fix:** Remove `stripe-simple` webhook handler. Keep only one webhook endpoint.

### SEC-015: No Deduplication of Stripe Webhook Events
- **File:** `src/app/api/webhooks/stripe/route.ts`, line 173+
- **Description:** No tracking of processed event IDs. Stripe retries = duplicate credits.
- **Fix:** Store processed event IDs in a `processed_webhook_events` table; skip already-processed events.

### SEC-016: Admin Routes Use getSession() Instead of getUser()
- **Files:** 8+ admin API routes (users/profiles, users/admins, affiliates/stats, affiliates/applications, etc.)
- **Description:** `getSession()` doesn't validate JWT server-side. Expired/tampered tokens could pass.
- **Fix:** Replace all `auth.getSession()` with `auth.getUser()` in server-side auth checks.

### SEC-017: Wrong Environment Variable Name - Broken Admin Auth
- **File:** `src/services/adminAuthServer.ts`, line 7
- **Description:** References `SUPABASE_SERVICE_KEY` but actual var is `SUPABASE_SERVICE_ROLE_KEY`. Creates broken Supabase client with `undefined` key.
- **Fix:** Change to `SUPABASE_SERVICE_ROLE_KEY`.

### SEC-018: SQL Injection via PostgREST .or() Filter
- **File:** `src/services/support.ts`, line 390
- **Description:** User input interpolated into `.or()` filter string without sanitization.
- **Fix:** Sanitize input or use separate `.ilike()` calls.

### SEC-019: 2FA Bypass with Hardcoded "123456"
- **File:** `src/app/api/admin/auth/2fa-verify/route.ts`, lines 9-20
- **Description:** Development mode accepts hardcoded token. Production path returns `false` (broken).
- **Fix:** Remove hardcoded bypass. Implement proper TOTP verification.

### SEC-020: Signup Endpoint - No Rate Limiting, Service Role Sign-In
- **File:** `src/app/api/auth/signup/route.ts`, lines 20-24, 200-224
- **Description:** No rate limiting. Uses service role key for signInWithPassword. Returns session tokens.
- **Fix:** Add rate limiting. Use anon key for sign-in, not service role.

### SEC-021: Cron Secret Has Weak Default
- **File:** `src/app/api/cron/reset-credits/route.ts`, line 12
- **Description:** Falls back to `'your-cron-secret-here'` if env var not set.
- **Fix:** Remove fallback. Require env var or deny all access.

### SEC-022: Notification Preferences POST - No Authentication
- **File:** `src/app/api/admin/notification-preferences/route.ts`, lines 166-276
- **Description:** POST handler uses service role client with zero auth. Leaks admin emails.
- **Fix:** Add authentication to POST handler.

### SEC-023: Admin Session Stored in localStorage
- **File:** `src/services/adminAuth.ts`, lines 50-60, 102-106
- **Description:** Full admin session (access token, permissions) in localStorage. XSS-accessible.
- **Fix:** Use httpOnly cookies only. Don't store tokens in localStorage.

### SEC-024: Debug/Test API Endpoints Deployed to Production
- **Files:** 20+ files matching `debug-*` and `test-*` patterns under `src/app/api/`
- **Description:** Middleware matcher doesn't cover these routes, so the `NODE_ENV` check never runs.
- **Fix:** Delete all debug/test API routes from the codebase.

### SEC-025: Infinite Retry Loop on 401 - No Limit
- **File:** `src/app/process/upscale/client.tsx`, lines 300-305
- **Description:** 401 response triggers `setTimeout(handleUpload, 2000)` with no retry cap. Infinite loop.
- **Fix:** Add retry counter, max 3-5 attempts.

### SEC-026: Race Condition - Double Credit Charge in Background Removal
- **File:** `src/app/process/background-removal/client.tsx`, lines 654-679
- **Description:** `creditsDeducted` is React state captured by closure. Two quick `result-generated` events both see `false`.
- **Fix:** Use `useRef` flag instead of state for the deduction guard.

### SEC-027: Infinite Recursion in useAsyncJob Retry Logic
- **File:** `src/hooks/useAsyncJob.ts`, lines 39-68
- **Description:** `setRetryCount` is async but recursive call uses stale closure value. Retries never actually increment.
- **Fix:** Use a ref or local counter variable for retry tracking.

### SEC-028: ignoreBuildErrors and ignoreDuringBuilds Enabled
- **File:** `next.config.js`, lines 9, 15
- **Description:** TypeScript and ESLint errors silently ignored in production builds.
- **Fix:** Set both to `false`. Fix all type/lint errors.

### SEC-029: Hardcoded Supabase URL Fallback
- **File:** `src/lib/supabase/service.ts`, line 8
- **Description:** Hardcoded production Supabase URL as fallback. Leaks project ID.
- **Fix:** Remove fallback. Fail loudly if env var missing.

---

## MEDIUM Severity (12 Issues) -- Fix This Sprint

### SEC-030: env.ts Mixes Server Secrets with Client Config
- **File:** `src/config/env.ts`
- **Description:** Single env file imported by both client and server components. Secret variable names leak into client bundle.
- **Fix:** Split into `env.server.ts` (with `import 'server-only'`) and `env.client.ts`.

### SEC-031: CSP Allows unsafe-inline and unsafe-eval
- **File:** `src/middleware.ts`, line 21
- **Description:** Significantly weakens XSS protection, especially combined with httpOnly:false cookies.
- **Fix:** Replace with nonce-based CSP. Remove unsafe-eval.

### SEC-032: Client-Controlled Credit Amount in Deduction
- **Files:** `src/app/api/process/deduct-credits/route.ts`, `src/app/api/credits/deduct/route.ts`
- **Description:** `creditsUsed` comes from request body. User can send 0 or negative values.
- **Fix:** Calculate cost server-side based on operation type.

### SEC-033: Missing Middleware Coverage for Many Routes
- **File:** `src/middleware.ts`, lines 117-144
- **Description:** `/api/affiliate/*`, `/api/auth/*`, `/api/cron/*`, `/api/webhooks/*` and others bypass middleware entirely (no security headers).
- **Fix:** Broaden middleware matcher or use catch-all pattern.

### SEC-034: Service Role Key Used as API Authorization Token
- **Files:** `src/app/api/credits/reset/route.ts`, `src/app/api/webhooks/stripe/route.ts`
- **Description:** `SUPABASE_SERVICE_ROLE_KEY` transmitted in HTTP `x-api-key` header for internal calls.
- **Fix:** Use a dedicated internal API secret, not the service role key.

### SEC-035: Welcome Email Accepts Arbitrary userId Without Auth
- **File:** `src/app/api/auth/welcome-email/route.ts`, lines 45-50
- **Description:** Unauthenticated code path sends emails to any user when userId + email provided.
- **Fix:** Remove unauthenticated path. Call internally from signup flow only.

### SEC-036: Admin Cache Allows 5-Minute Stale Status
- **File:** `src/lib/auth-middleware.ts`, lines 6-7
- **Description:** Admin privilege check cached 5 minutes. Revoked admin retains access.
- **Fix:** Reduce to 60 seconds or add cache invalidation.

### SEC-037: Missing File Type Validation for ClippingMagic Uploads
- **Files:** `src/app/api/clippingmagic/upload/route.ts`, `upload-large/route.ts`
- **Description:** No MIME type validation before forwarding files to ClippingMagic API.
- **Fix:** Validate against allowed MIME types (`image/jpeg`, `image/png`, `image/webp`).

### SEC-038: Admin Login Rate Limit Too Generous
- **File:** `src/app/api/admin/auth/login/route.ts`, line 206
- **Description:** Uses 'admin' rate limit (200 req/min) instead of 'auth' (5 per 5 min).
- **Fix:** Change to `withRateLimit(handlePost, 'auth')`.

### SEC-039: compressImage Promise Never Resolves on Error
- **File:** `src/app/process/background-removal/client.tsx`, lines 362-460
- **Description:** No `reject` handler, no `reader.onerror`, no `img.onerror`. UI hangs indefinitely on failure.
- **Fix:** Add `reject` and error handlers to the Promise.

### SEC-040: Boolean vs String Comparison Always Fails
- **File:** `src/app/process/upscale/client.tsx`, line 399
- **Description:** `fromDpiTool` is boolean but compared to `'true'` string. DPI tool redirect never works.
- **Fix:** Change `if (fromDpiTool === 'true')` to `if (fromDpiTool)`.

### SEC-041: x-has-session Debug Header in Production
- **File:** `src/middleware.ts`, lines 88-92
- **Description:** Leaks authentication state on all responses.
- **Fix:** Remove header or restrict to development.

---

## LOW Severity (6 Issues) -- Fix When Convenient

### SEC-042: Duplicate next.config Files
- **Files:** `next.config.js` and `next.config.ts`
- **Fix:** Delete the empty `next.config.ts`.

### SEC-043: Duplicate experimental Key in next.config.js
- **File:** `next.config.js`, lines 23 and 114
- **Fix:** Merge into single experimental block.

### SEC-044: Console Logging of Sensitive Data in Production
- **Files:** Multiple (auth.ts, webhook route, etc.)
- **Fix:** Remove or redact PII from console.log statements.

### SEC-045: Affiliate Cookie Without Secure Flag
- **File:** `src/services/affiliate.ts`, line 617
- **Fix:** Add `; Secure` to cookie string.

### SEC-046: Rate Limiter Fails Open
- **File:** `src/lib/rate-limit.ts`, lines 224-228
- **Description:** If Redis is down, all requests pass through.
- **Fix:** Fail closed for critical endpoints (login, payments).

### SEC-047: Inconsistent Password Validation Between Signup Paths
- **Files:** `src/components/auth/SignupModal.tsx` (6 chars), `src/components/auth/SignupForm.tsx` (8 chars + complexity)
- **Fix:** Use same zod schema in both paths.

---

## Action Plan - Prioritized Fix Order

### Phase 1: EMERGENCY (Day 1) -- Active Exploits
**Goal: Close attack vectors that allow free credits and unauthorized access**

| # | Action | Risk if Not Fixed | Effort |
|---|--------|-------------------|--------|
| 1 | Delete `src/app/api/debug-credits/route.ts` | Free credits for anyone | 1 min |
| 2 | Delete `src/app/api/webhooks/stripe/debug-route.ts` | Free credits via forged webhook | 1 min |
| 3 | Add auth to `create-checkout-session/route.ts` | Checkout for arbitrary users | 15 min |
| 4 | Add auth to `create-payment-intent/route.ts` | Payment for arbitrary users | 15 min |
| 5 | Lock down `credits/refund/route.ts` (admin-only or delete) | Unlimited free credits | 10 min |
| 6 | Fix `credits/reset/route.ts` stripe-signature bypass | Credit reset by anyone | 10 min |
| 7 | Delete all `debug-*` and `test-*` API routes | Info disclosure, email abuse | 15 min |
| 8 | Remove hardcoded ClippingMagic credentials from ImageProcessor.tsx | API key theft | 5 min |

**Estimated time: ~1 hour**
**Risk level: These are all currently exploitable in production**

### Phase 2: CRITICAL SECURITY (Day 1-2) -- Session & Auth Hardening
**Goal: Prevent session hijacking and auth bypass**

| # | Action | Risk if Not Fixed | Effort |
|---|--------|-------------------|--------|
| 9 | Set admin_session cookie to `httpOnly: true` | XSS = admin takeover | 10 min |
| 10 | Remove `sb-auth-token` custom cookie | Token theft via XSS | 5 min |
| 11 | Fix impersonation to verify admin session | Account impersonation | 30 min |
| 12 | Replace `getSession()` with `getUser()` in admin routes | JWT forgery/replay | 30 min |
| 13 | Fix `adminAuthServer.ts` env var name | Broken admin verification | 2 min |
| 14 | Remove 2FA hardcoded bypass | 2FA bypass in dev/staging | 10 min |
| 15 | Fix SSRF in image processing routes | Cloud credential theft | 30 min |
| 16 | Fix open redirect in affiliate tracking | Phishing attacks | 15 min |

**Estimated time: ~2-3 hours**

### Phase 3: FINANCIAL INTEGRITY (Day 2-3) -- Credit System Hardening
**Goal: Prevent credit fraud and double-charging**

| # | Action | Risk if Not Fixed | Effort |
|---|--------|-------------------|--------|
| 17 | Make credit deduction atomic (SQL-level) | Double-spending | 1 hour |
| 18 | Remove `stripe-simple` webhook handler | Double credit allocation | 15 min |
| 19 | Add webhook event deduplication table | Duplicate credit grants | 1 hour |
| 20 | Server-side credit cost calculation | Free/cheap operations | 30 min |
| 21 | Use dedicated internal API secret (not service role key) | Key exposure amplification | 30 min |
| 22 | Fix `useRef` for creditsDeducted in bg-removal | Double charge on client | 15 min |

**Estimated time: ~3-4 hours**

### Phase 4: AUTH & RATE LIMITING (Day 3-4) -- Defense in Depth
**Goal: Strengthen authentication and abuse prevention**

| # | Action | Risk if Not Fixed | Effort |
|---|--------|-------------------|--------|
| 23 | Add rate limiting to signup endpoint | Mass account creation | 10 min |
| 24 | Fix admin login rate limit (200/min -> 5/5min) | Admin brute force | 5 min |
| 25 | Add auth to notification-preferences POST | Admin email enumeration | 15 min |
| 26 | Fix welcome-email unauthenticated path | Email abuse | 15 min |
| 27 | Remove cron secret fallback default | Cron job hijacking | 5 min |
| 28 | Stop storing admin session in localStorage | Persistent token theft | 30 min |
| 29 | Broaden middleware matcher coverage | Missing security headers | 30 min |

**Estimated time: ~2 hours**

### Phase 5: CODE QUALITY (Week 2) -- Bug Fixes & Hardening
**Goal: Fix application bugs and improve resilience**

| # | Action | Risk if Not Fixed | Effort |
|---|--------|-------------------|--------|
| 30 | Fix infinite retry loop in upscale client | DoS on own server | 15 min |
| 31 | Fix infinite recursion in useAsyncJob | App crash | 15 min |
| 32 | Fix compressImage promise error handling | UI hangs | 15 min |
| 33 | Fix boolean vs string comparison in upscale | Broken DPI tool flow | 5 min |
| 34 | Split env.ts into server/client variants | Secret name leakage | 1 hour |
| 35 | Set ignoreBuildErrors to false, fix errors | Hidden bugs deployed | 2-4 hours |
| 36 | Remove debug info from ResetPasswordForm | Info disclosure | 5 min |
| 37 | Strengthen CSP (remove unsafe-inline/eval) | XSS protection weakened | 2 hours |
| 38 | Fix password validation consistency | Weak passwords | 15 min |

**Estimated time: ~6-8 hours**

### Phase 6: CLEANUP (Week 2-3) -- Polish & Maintenance
**Goal: Clean up remaining issues**

| # | Action | Risk if Not Fixed | Effort |
|---|--------|-------------------|--------|
| 39 | Delete empty next.config.ts | Confusion | 1 min |
| 40 | Merge duplicate experimental config | Config loss | 5 min |
| 41 | Remove sensitive console.log statements | PII in logs | 1 hour |
| 42 | Add Secure flag to affiliate cookie | Cookie over HTTP | 5 min |
| 43 | Fix rate limiter to fail closed for critical endpoints | Bypass when Redis down | 30 min |
| 44 | Add file type validation for ClippingMagic | API abuse | 15 min |
| 45 | Reduce admin cache to 60s | Stale admin status | 5 min |
| 46 | Remove x-has-session debug header | Info disclosure | 5 min |
| 47 | Remove hardcoded Supabase URL fallback | Wrong database connection | 5 min |

**Estimated time: ~3 hours**

---

## Summary Statistics

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 12 | Needs immediate attention |
| High | 17 | Fix within days |
| Medium | 12 | Fix within sprint |
| Low | 6 | Fix when convenient |
| **Total** | **47** | |

### Risk Categories
| Category | Count |
|----------|-------|
| Authentication/Authorization Bypass | 12 |
| Financial/Credit System | 10 |
| Information Disclosure | 8 |
| Input Validation / Injection | 5 |
| Session Management | 4 |
| Application Bugs (crashes/loops) | 4 |
| Configuration Issues | 4 |

### Estimated Total Remediation Time
- **Phase 1 (Emergency):** ~1 hour
- **Phase 2 (Critical Security):** ~2-3 hours
- **Phase 3 (Financial Integrity):** ~3-4 hours
- **Phase 4 (Auth & Rate Limiting):** ~2 hours
- **Phase 5 (Code Quality):** ~6-8 hours
- **Phase 6 (Cleanup):** ~3 hours
- **Total:** ~17-21 hours

---

## Key Principle for Fixes

**Every fix must be non-breaking.** The action plan is ordered so that:
1. Deletions of debug files have zero impact on production features
2. Adding auth to existing endpoints doesn't change behavior for legitimate users
3. Cookie changes only affect admin login flow (re-login required)
4. Credit system changes use backward-compatible atomic operations
5. Rate limiting additions only affect abuse scenarios
6. Config changes are additive, not breaking

Each phase builds on the previous one, and any phase can be deployed independently without breaking the application.
