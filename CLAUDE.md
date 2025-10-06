# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 IMPORTANT: Start Every Session By Reading These Files

**ALWAYS read these files at the beginning of each conversation:**

1. **`SESSION_END_2025_07_31.md`** - 🔴 READ THIS FIRST! Summary of last session and next steps
2. **`ADMIN_CREDENTIALS.md`** - 🔴 CRITICAL: Admin login info and common mistakes
3. **`DTF_EDITOR_PRD.md`** - Product Requirements Document (understand the project)
4. **`DEVELOPMENT_ROADMAP_V3.md`** - Current development plan and phases (use V3, not V2!)
5. **`DEVELOPMENT_LOG.md`** - Recent work, issues, and solutions
6. **`BUGS_TRACKER.md`** - Known bugs and their status
7. **`COMPLETION_TRACKER.md`** - What features are complete
8. **`API_CODE_EXAMPLES.md`** - Verified API code examples for all integrations

## 🔐 CRITICAL ADMIN INFORMATION

**SUPER ADMIN EMAIL:** `Shannon@S2Transfers.com` (capital S, capital T)
**NOT:** shannonherod@gmail.com (this is a testing account, not primary admin)

**ALWAYS CHECK FIRST when debugging admin issues:**

1. ✅ Is user logged in? (Check for "Sign In" button in header)
2. ✅ Using Shannon@S2Transfers.com? (NOT shannonherod@gmail.com)
3. ✅ Correct environment? (production vs local have separate sessions)

See `ADMIN_CREDENTIALS.md` for complete admin system documentation.

## 🔄 CRITICAL: Development Process Rules

**AFTER COMPLETING ANY FEATURE OR TASK:**

1. **Update `DEVELOPMENT_ROADMAP_V3.md`** immediately to mark items as complete
2. **Update `DEVELOPMENT_LOG.md`** with what was done, issues found, and time taken
3. **Update `COMPLETION_TRACKER.md`** if a major feature was completed
4. **Update `BUGS_TRACKER.md`** if any bugs were found or fixed

**BEFORE STARTING ANY NEW FEATURE:**

1. **Read `DEVELOPMENT_ROADMAP_V3.md`** to see current status and next tasks
2. **Check `BUGS_TRACKER.md`** for any critical issues that might affect the feature
3. **Review `API_CODE_EXAMPLES.md`** if implementing API integrations
4. **Use TodoWrite tool** to track sub-tasks during implementation

## 🐛 BUG TRACKING PROCESS

**WHEN USER REPORTS AN ISSUE:**

1. **Immediately log it in `BUGS_TRACKER.md`** with:
   - Description of the issue
   - Steps to reproduce
   - Current status: "🔴 Active"
   - Severity level (Critical/High/Medium/Low)
   - Date reported

**AFTER FIXING THE BUG:**

1. **Wait for user confirmation** that the fix works
2. **Update `BUGS_TRACKER.md`** to mark as "🟢 Fixed"
3. **Update `DEVELOPMENT_LOG.md`** with:
   - What the bug was
   - How it was fixed
   - Any lessons learned
   - Code changes made

**Example Bug Report Flow:**

- User: "The dashboard shows a blank page with 500 errors"
- Claude: _Logs in BUGS_TRACKER.md as Active bug_
- Claude: _Investigates and fixes the issue_
- User: "It's working now!"
- Claude: _Updates BUGS_TRACKER.md to Fixed_
- Claude: _Updates DEVELOPMENT_LOG.md with fix details_

## Project Overview

DTF Editor is a mobile-first web application for creating print-ready Direct to Film (DTF) transfers. It provides AI-powered image processing tools including upscaling, background removal, vectorization, and image generation.

## Development Commands

```bash
# Development
npm run dev              # Start development server on http://localhost:3000

# Building & Production
npm run build            # Build for production
npm start                # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run format:check     # Check formatting without changing files
npm run type-check       # Run TypeScript type checking

# Testing
npm test                 # Run all tests
npm run test:ui          # Run tests with UI
npm run test:coverage    # Run tests with coverage report

# Database
npm run db:setup         # Setup database (run scripts/setup-database.js)
```

## Architecture Overview

### Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4 with custom design system
- **State Management**: Zustand stores + React Context (AuthContext)
- **Database**: Supabase (PostgreSQL with RLS policies)
- **Authentication**: Supabase Auth with email/password
- **Payments**: Stripe (subscriptions + pay-as-you-go)
- **AI Services**: OpenAI, Deep-Image.ai, ClippingMagic, Vectorizer.ai
- **Testing**: Vitest + React Testing Library
- **Deployment**: Vercel

### Key Architectural Patterns

1. **Service Layer Pattern**: All external API calls go through service modules in `src/services/`
   - `auth.ts` - Supabase authentication
   - `stripe.ts` - Payment processing
   - `deepImage.ts` - Image upscaling
   - `storage.ts` - File storage operations

2. **State Management**: Hybrid approach
   - Zustand for global state (`authStore.ts`)
   - React Context for auth state distribution (`AuthContext.tsx`)
   - Local component state for UI interactions

3. **Component Organization**:
   - `ui/` - Reusable base components (Button, Input, Card, etc.)
   - `auth/` - Authentication forms and flows
   - `image/` - Image processing components
   - `payment/` - Stripe integration components
   - `layout/` - App layout components

4. **API Routes**: Next.js API routes in `src/app/api/`
   - Webhook handling (Stripe)
   - Server-side API integrations
   - Protected endpoints with auth checks

### Critical Implementation Details

1. **Environment Variables**: Validated in `src/config/env.ts`
   - All Supabase, Stripe, and AI service keys required
   - Type-safe access throughout the app

2. **Authentication Flow**:
   - Email/password auth with Supabase
   - Session persistence with cookies
   - Protected routes using middleware
   - RLS policies enforce data access

3. **Credit System**:
   - Users have credits for AI operations
   - Free tier: 2 credits/month
   - Paid plans: 20-60 credits/month
   - Pay-as-you-go packages available

4. **Image Processing Pipeline**:
   - Upload → Process (upscale/remove bg/vectorize) → Download
   - Real-time status updates
   - Error handling with credit refunds

5. **Path Aliases**: Use `@/` for imports from `src/`
   ```typescript
   import { Button } from '@/components/ui/Button';
   ```

## Common Development Tasks

### Running a Single Test

```bash
npm test -- path/to/test.spec.ts
```

### Checking Supabase Connection

```javascript
// Use scripts/check-users.js
node scripts/check-users.js
```

### Testing Stripe Webhooks Locally

Use Stripe CLI to forward webhooks to localhost:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Implementing API Integrations

**IMPORTANT**: When implementing or updating API integrations, follow this process:

1. **Check Local Examples First**: Reference `API_CODE_EXAMPLES.md` for existing verified examples
2. **Use Context7 MCP for Latest Samples**: If you need up-to-date code samples or the local examples are outdated:
   - Use the Context7 MCP server to search for the latest API documentation and code samples
   - Context7 provides access to current documentation from official sources
   - Example: Search for "Deep-Image.ai API examples" or "Stripe webhook implementation"
3. **Verify Against Official Docs**: Cross-reference samples with official API documentation
4. **Update Local Examples**: After verifying new samples work, update `API_CODE_EXAMPLES.md`
5. **Test Before Production**: Always test with the examples first before modifying for specific use cases

### Adding New API Examples

When you receive new API documentation or examples:

```bash
# Use the interactive script to add examples
node scripts/add-api-example.js

# Or manually edit API_CODE_EXAMPLES.md following the existing format
```

## Important Notes

- Always run `npm run lint` and `npm run type-check` before committing
- The app uses mobile-first responsive design
- All monetary values in Stripe are in cents
- Image uploads limited to 10MB
- Supabase RLS policies must be maintained for security

## Development Tracking Files

**Always reference and update these files during development:**

1. **`DEVELOPMENT_ROADMAP_V2.md`** - Current development plan with Phase 0 fixes
   - Use this instead of the original roadmap
   - Follow phases in order - don't skip ahead

2. **`COMPLETION_TRACKER.md`** - Feature completion status
   - Update when starting/completing features
   - Check what's already done before implementing

3. **`DEVELOPMENT_LOG.md`** - Development diary
   - Update after completing each task
   - Log challenges, solutions, and lessons learned
   - Track time estimates vs actual

4. **`BUGS_TRACKER.md`** - Known bugs and fixes
   - Check before starting work to see known issues
   - Add new bugs as discovered
   - Update status when fixing bugs

## Using MCP Servers for Research

### Context7 MCP Integration

The Context7 MCP server is configured to help find up-to-date code samples and documentation:

**🚨 CRITICAL for Phase 4-8 Development:**
When implementing Stripe subscriptions, Supabase features, or any API integration, ALWAYS check Context7 for the latest documentation first. APIs change frequently and outdated examples can waste hours of debugging.

**When to Use Context7:**

- **Stripe Integration** - Payment intents, subscriptions, webhooks, checkout sessions
- **Supabase Features** - RLS policies, Edge Functions, Realtime subscriptions
- Need latest API documentation for services (Deep-Image.ai, ClippingMagic, Vectorizer.ai, etc.)
- Looking for current best practices or implementation patterns
- Troubleshooting API integration issues with recent changes
- Finding code examples not yet in `API_CODE_EXAMPLES.md`

**How to Use:**

1. Use MCP tools to search Context7 for specific API documentation
2. Verify the information is current and from official sources
3. Test the code samples in the project
4. Update `API_CODE_EXAMPLES.md` with verified working examples

**Priority Searches for Business Features:**

- "Stripe subscription API Next.js 2025"
- "Stripe checkout session custom success URL"
- "Supabase cron jobs Edge Functions"
- "Stripe webhook endpoint verification Node.js"
- "Supabase RLS policies for multi-tenant"
- "Stripe subscription proration calculation"

**Example Searches:**

- "Deep-Image.ai API authentication headers"
- "Stripe webhook signature verification Next.js"
- "Supabase RLS policies best practices 2025"
- "ClippingMagic API response format"

## Current Development Status

- **Completed Phases:** 0, 1, 2, 3, 4, 5 ✅
- **Phase 7 (Admin):** 98% complete (just needs logging updates)
- **Next Phase:** 8 - Email System (SendGrid Integration)
- **Priority:** Implement transactional email system
- **Session Summary:** See SESSION_END_2025_07_31.md for detailed handoff

## 📋 Development Workflow Checklist

**Starting a New Task:**

- [ ] Read DEVELOPMENT_ROADMAP_V3.md for current status
- [ ] Check BUGS_TRACKER.md for related issues
- [ ] Create todos with TodoWrite tool
- [ ] Review API_CODE_EXAMPLES.md if needed

**During Development:**

- [ ] Update todos as you progress
- [ ] Document any issues found
- [ ] Test thoroughly before marking complete
- [ ] Run lint and type-check commands

**After Completing a Task:**

- [ ] Update DEVELOPMENT_ROADMAP_V3.md ✅
- [ ] Update DEVELOPMENT_LOG.md with details
- [ ] Update COMPLETION_TRACKER.md if major feature
- [ ] Update BUGS_TRACKER.md if bugs found/fixed
- [ ] Commit changes with clear message
- shannon@S2Transfers.com is the super admin for this project
- remeber dont make breaking changes without a detailed plan to fix the features that are broken by the change
- allways deploy via github
