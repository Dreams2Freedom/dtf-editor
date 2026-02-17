# DTF Editor - Security Re-Audit Report (February 16, 2026)

**Date:** February 16, 2026
**Previous Audit:** February 8, 2026 (47 issues)
**Method:** 4 parallel deep-scan agents covering API routes, client-side, config/infra, and financial flows
**New Issues Found:** 28
**Issues Fixed in This PR:** 30+

---

## What Was Done

### Re-Audit Scope
- **API Routes:** All 117 endpoints audited for auth, rate limiting, input validation, error leakage
- **Client-Side:** XSS, secrets exposure, localStorage issues, permission bypasses
- **Config/Infrastructure:** next.config, middleware, CSP, RLS policies, dependencies
- **Financial Flows:** Stripe, credits, webhooks, subscriptions, coupons, refunds

### Fixes Applied (4 Commits)

#### Tier 1: CRITICAL (8 items)
- **NEW-01:** Added authentication to create-subscription endpoint
- **NEW-02:** Created RLS migration for 9 unprotected Supabase tables
- **NEW-03:** Removed full DB data from cron backup response
- **NEW-04:** Removed sensitive error.message details from ~18 API responses
- **NEW-05:** Sanitized dangerouslySetInnerHTML in affiliate agreement page
- **NEW-06:** Deleted test page containing hardcoded ClippingMagic API secrets
- **SEC-005:** Added admin-only check to credit refund endpoint
- **SEC-028:** Set ignoreBuildErrors/ignoreDuringBuilds to false

#### Tier 2: HIGH (9 items)
- **SEC-009:** HMAC-signed impersonation cookies (new `cookie-signing.ts` utility)
- **SEC-015:** Database-backed webhook event deduplication (new migration)
- **SEC-034/NEW-10:** Replaced HTTP fetch + service key leak with direct Supabase RPC
- **SEC-046/NEW-14:** Rate limiter fails closed for auth/payment endpoints
- **NEW-07:** Removed debug headers from admin login response
- **NEW-12:** Added explicit logging to credit deduction fallback
- **NEW-13:** Added column allowlist for admin users sortBy parameter
- **NEW-20:** Enforced max pagination limit (100)
- **SEC-042/SEC-043:** Deleted duplicate next.config.ts, merged experimental config

#### Tier 3: MEDIUM (7 items)
- **NEW-17:** Validate coupon discount_type and discount_value bounds
- **NEW-19:** Escape user data in email template variables (HTML entities)
- **NEW-21:** Added rate limiting to security-alert endpoint
- **SEC-036:** Reduced admin cache from 5 minutes to 60 seconds
- **SEC-039:** Added error handlers to compressImage promise
- **SEC-040:** Fixed boolean vs string comparison for DPI tool redirect

#### Tier 4: LOW (3 items)
- **SEC-045:** Added Secure flag to affiliate tracking cookie
- **NEW-26:** Added is_active check to admin authorization
- **NEW-27:** Fixed refund credit deduction (Math.floor instead of Math.ceil)

---

## Remaining Items (Not Fixed in This PR)

These require more extensive changes or manual verification:

| ID | Severity | Issue | Reason Not Fixed |
|----|----------|-------|-----------------|
| SEC-023 | HIGH | Admin session in localStorage | Requires client-side auth refactor |
| NEW-08 | HIGH | Full session JSON in admin cookie | Requires session ID approach |
| NEW-09 | HIGH | Client-side admin permission checks | Requires server-side permission API |
| NEW-15 | HIGH | Dependency vulnerabilities | Requires `npm audit fix` + testing |
| SEC-018 | HIGH | SQL injection in support.ts .or() | Needs verification |
| SEC-031 | MEDIUM | CSP unsafe-inline/unsafe-eval | Requires nonce-based CSP implementation |
| SEC-030 | MEDIUM | env.ts mixes server/client | Requires import restructuring |
| SEC-033 | MEDIUM | Missing middleware coverage | Needs careful testing |
| SEC-026 | HIGH | Double credit charge (closure bug) | Needs verification |
| SEC-027 | HIGH | useAsyncJob infinite recursion | Needs verification |
| NEW-16 | MEDIUM | Past-due subscription access | Requires access control middleware |
| NEW-18 | MEDIUM | Bulk credits not atomic | Requires DB transaction/RPC |
| NEW-22 | MEDIUM | IP address parsing | Infrastructure-specific |
| NEW-23 | MEDIUM | File upload magic numbers | Requires binary header checking |
| SEC-044 | LOW | Console.log PII leaks | Many files, manual review |
| SEC-047 | LOW | Password validation inconsistency | UI component change |
| NEW-24 | LOW | DPI tool localStorage images | UX consideration |
| NEW-25 | LOW | Upload size limit mismatch | Config alignment |
| NEW-28 | LOW | No structured logging | Infrastructure project |

### Database Migrations Required

Two new migrations must be applied to Supabase:

1. **`20260216_enable_rls_unprotected_tables.sql`** — Enables RLS + policies on 9 tables
2. **`20260216_webhook_dedup_table.sql`** — Creates `processed_webhook_events` table

Apply via Supabase Dashboard > SQL Editor, or `supabase db push`.
