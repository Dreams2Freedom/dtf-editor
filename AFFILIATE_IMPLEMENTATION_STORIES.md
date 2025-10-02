# Affiliate Program - Detailed Implementation Stories

**Version:** 1.0  
**Date:** January 2025  
**Estimated Total Time:** 4 weeks  
**Developer Resources:** 1 Full-stack developer  

---

## 🎯 **Implementation Strategy**

We'll build this incrementally, with each story being small, testable, and deployable. Each story should take 1-4 hours maximum to complete.

---

## 📦 **Phase 1: Database & Foundation (3 days)**

### **Day 1: Database Setup**

#### **Story 1.1: Create Affiliate Tables** ⏱ 2 hours
**Task:** Set up core database schema
```sql
-- Run migrations for:
- affiliates table
- referrals table  
- referral_visits table
- commissions table
- payouts table
```
**Acceptance Criteria:**
- [ ] All tables created successfully
- [ ] Foreign key relationships established
- [ ] RLS policies created
- [ ] Indexes added for performance
- [ ] Test data can be inserted

#### **Story 1.2: Create Database Functions** ⏱ 2 hours
**Task:** Create helper functions and triggers
```sql
-- Functions needed:
- generate_referral_code()
- calculate_commission()
- check_referral_validity()
- update_commission_status()
```
**Acceptance Criteria:**
- [ ] Functions work with test data
- [ ] Triggers update timestamps
- [ ] Commission calculations accurate
- [ ] Error handling in place

#### **Story 1.3: Create API Types** ⏱ 1 hour
**Task:** Define TypeScript types for affiliate system
```typescript
// Create types/affiliate.ts
interface Affiliate {...}
interface Referral {...}
interface Commission {...}
```
**Acceptance Criteria:**
- [ ] All types match database schema
- [ ] Exported for use in components
- [ ] JSDoc comments added
- [ ] No TypeScript errors

### **Day 2: Registration & Basic API**

#### **Story 2.1: Affiliate Registration UI** ⏱ 3 hours
**Task:** Create affiliate application form
**File:** `/app/affiliate/apply/page.tsx`
**Fields:**
- Website/Social Media URL
- Audience Size
- Promotion Method
- Why join program?
- Tax Information (US/International selection)
- Agreement checkbox

**Acceptance Criteria:**
- [ ] Form validation works
- [ ] Mobile responsive
- [ ] Shows success message
- [ ] Redirects after submission
- [ ] Loading states handled

#### **Story 2.2: Registration API Endpoint** ⏱ 2 hours
**Task:** Create affiliate registration endpoint
**File:** `/api/affiliate/apply/route.ts`
```typescript
POST /api/affiliate/apply
- Validate user is logged in
- Check not already affiliate
- Generate unique referral code
- Send notification email
- Return success/error
```
**Acceptance Criteria:**
- [ ] Creates affiliate record
- [ ] Generates unique code
- [ ] Sends email to admin
- [ ] Handles duplicates
- [ ] Returns proper status codes

#### **Story 2.3: Admin Approval Interface** ⏱ 2 hours  
**Task:** Add affiliate management to admin panel
**File:** `/app/admin/affiliates/page.tsx`
**Features:**
- List pending applications
- View application details
- Approve/Reject buttons
- Add notes

**Acceptance Criteria:**
- [ ] Shows all pending affiliates
- [ ] Can approve/reject
- [ ] Updates status in database
- [ ] Sends notification emails
- [ ] Logs admin actions

### **Day 3: Link Generation & Tracking Setup**

#### **Story 3.1: Referral Link Generator** ⏱ 2 hours
**Task:** Create link generation component
**File:** `/components/affiliate/LinkGenerator.tsx`
**Features:**
- Base URL input
- UTM parameter fields
- Copy to clipboard
- QR code generation
- Short URL option

**Acceptance Criteria:**
- [ ] Generates valid URLs
- [ ] Adds referral code
- [ ] UTM parameters optional
- [ ] Copy button works
- [ ] QR code displays

#### **Story 3.2: Cookie Tracking Implementation** ⏱ 3 hours
**Task:** Implement referral tracking system
**Files:**
- `/lib/affiliate-tracking.ts`
- `/middleware.ts` (update)

**Features:**
```typescript
// Cookie functions
setAffiliateCookie(code, 30 days)
getAffiliateCookie()
clearAffiliateCookie()
// Tracking functions
trackVisit(code, landing)
attributeReferral(userId)
```

**Acceptance Criteria:**
- [ ] Cookie sets on ?ref= parameter
- [ ] 30-day expiration works
- [ ] Survives navigation
- [ ] localStorage backup works
- [ ] Server can read cookie

#### **Story 3.3: Visit Tracking API** ⏱ 1 hour
**Task:** Track all referral link clicks
**File:** `/api/affiliate/track/route.ts`
```typescript
POST /api/affiliate/track
- Record visit in database
- Update click count
- Store landing page
- Return success
```
**Acceptance Criteria:**
- [ ] Records all visits
- [ ] No duplicate tracking
- [ ] Updates statistics
- [ ] Fast response time

---

## 📈 **Phase 2: Conversion Tracking (3 days)**

### **Day 4: User Attribution**

#### **Story 4.1: Signup Attribution** ⏱ 3 hours
**Task:** Link new users to affiliates
**File:** Update `/api/auth/signup/route.ts`
**Logic:**
```typescript
// On successful signup:
1. Check for affiliate cookie
2. Validate referral code
3. Create referral record
4. Link user to affiliate
5. Track conversion funnel
```
**Acceptance Criteria:**
- [ ] Attributes on signup
- [ ] Validates referral code
- [ ] Prevents self-referral
- [ ] Records attribution time
- [ ] Updates affiliate stats

#### **Story 4.2: Payment Attribution** ⏱ 3 hours
**Task:** Track conversions to paid
**File:** Update `/api/webhooks/stripe/route.ts`
**Logic:**
```typescript
// On payment success:
1. Check if user has referral
2. Update referral status to 'converted'
3. Calculate commission
4. Create commission record
5. Notify affiliate (optional)
```
**Acceptance Criteria:**
- [ ] Tracks first payment
- [ ] Calculates correct commission
- [ ] Handles subscriptions
- [ ] Handles one-time purchases
- [ ] Updates in real-time

#### **Story 4.3: Commission Calculation Service** ⏱ 3 hours
**Task:** Create commission calculation logic with 24-month cap
**File:** `/services/commission.ts`
**Functions:**
```typescript
calculateCommission(amount, type, tier, monthsSinceReferral)
applyCommissionRules(commission, rules)
handleRefund(transactionId)
handleSubscriptionChange(subId, change)
getCommissionRate(tier, monthsSinceReferral) // 20-25% first 24mo, 10% after
checkBonusCap(totalBonuses) // Max 5% additional
```
**Acceptance Criteria:**
- [ ] Calculates accurately with time-based rates
- [ ] Applies 24-month cap correctly
- [ ] Switches to 10% after 24 months
- [ ] Bonus cap at 5% total
- [ ] Refund deductions work
- [ ] Well-tested with unit tests

### **Day 5: Affiliate Dashboard**

#### **Story 5.1: Dashboard Layout** ⏱ 2 hours
**Task:** Create affiliate dashboard structure
**File:** `/app/affiliate/dashboard/page.tsx`
**Sections:**
- Stats overview (clicks, signups, earnings)
- Recent referrals table
- Performance chart
- Quick actions menu

**Acceptance Criteria:**
- [ ] Mobile responsive
- [ ] Loading states
- [ ] Error handling
- [ ] Real-time updates
- [ ] Clean design

#### **Story 5.2: Statistics API** ⏱ 2 hours
**Task:** Create affiliate stats endpoint
**File:** `/api/affiliate/stats/route.ts`
**Returns:**
```json
{
  "clicks": 1234,
  "signups": 45,
  "conversions": 12,
  "earnings": {
    "pending": 150.00,
    "approved": 450.00,
    "paid": 1200.00
  },
  "conversion_rate": 26.7
}
```
**Acceptance Criteria:**
- [ ] Returns accurate data
- [ ] Filtered by date range
- [ ] Caches for performance
- [ ] Includes all metrics

#### **Story 5.3: Referrals List Component** ⏱ 3 hours
**Task:** Show detailed referral list
**File:** `/components/affiliate/ReferralsList.tsx`
**Features:**
- User email/name
- Signup date
- Status (pending/converted)
- Commission amount
- Payment status

**Acceptance Criteria:**
- [ ] Paginated list
- [ ] Sortable columns
- [ ] Status badges
- [ ] Search/filter
- [ ] Export to CSV

### **Day 6: Marketing Materials**

#### **Story 6.1: Materials Library Page** ⏱ 2 hours
**Task:** Create marketing materials page
**File:** `/app/affiliate/materials/page.tsx`
**Sections:**
- Banners (multiple sizes)
- Email templates
- Social media posts
- Brand guidelines

**Acceptance Criteria:**
- [ ] Download buttons work
- [ ] Preview images
- [ ] Copy text snippets
- [ ] Organized by category
- [ ] Search functionality

#### **Story 6.2: Custom Link Builder** ⏱ 2 hours
**Task:** Advanced link generation tool
**File:** `/components/affiliate/AdvancedLinkBuilder.tsx`
**Features:**
- Deep linking to pages
- Campaign tracking
- A/B test variants
- Bulk generation
- Import/Export

**Acceptance Criteria:**
- [ ] Generates valid deep links
- [ ] Saves link history
- [ ] Exports link list
- [ ] Tracks performance
- [ ] User-friendly UI

---

## 💰 **Phase 3: Payout System (3 days)**

### **Day 7: Payout Management**

#### **Story 7.1: Payout Request UI** ⏱ 2 hours
**Task:** Create payout request interface
**File:** `/app/affiliate/payouts/page.tsx`
**Features:**
- Available balance display
- Request payout button
- Payment method selection
- Payout history table

**Acceptance Criteria:**
- [ ] Shows correct balance
- [ ] $50 minimum enforced
- [ ] Payment method saved
- [ ] History displays
- [ ] Status badges work

#### **Story 7.2: Payout Request API** ⏱ 2 hours
**Task:** Handle payout requests
**File:** `/api/affiliate/payouts/request/route.ts`
**Logic:**
```typescript
POST /api/affiliate/payouts/request
- Validate minimum balance
- Check payment method
- Create payout record
- Update commission status
- Send confirmation email
```
**Acceptance Criteria:**
- [ ] Validates balance
- [ ] Creates payout record
- [ ] Locks commissions
- [ ] Sends emails
- [ ] Returns confirmation

#### **Story 7.3: Tax Form Collection** ⏱ 3 hours
**Task:** Collect and validate tax documentation
**Files:**
- `/app/affiliate/tax-forms/page.tsx`
- `/api/affiliate/tax-forms/route.ts`

**Requirements:**
- W-9 form for US affiliates
- W-8BEN form for international
- Secure storage of tax info
- Block payouts until completed
- Annual 1099-MISC generation for $600+

**Acceptance Criteria:**
- [ ] Tax form selection (US/International)
- [ ] Form validation
- [ ] Secure encrypted storage
- [ ] Blocks payout if not completed
- [ ] Admin can view status
- [ ] Reminder emails sent

#### **Story 7.4: Payment Method Management** ⏱ 2 hours
**Task:** Save payment preferences
**File:** `/api/affiliate/payment-method/route.ts`
**Supported Methods:**
- PayPal email
- Check (mailing address required)

**Acceptance Criteria:**
- [ ] Saves securely
- [ ] Validates PayPal email format
- [ ] Validates mailing address for checks
- [ ] Updates existing
- [ ] Encrypts sensitive data
- [ ] Audit logging

### **Day 8: Admin Payout Processing**

#### **Story 8.1: Payout Queue Admin Page** ⏱ 3 hours
**Task:** Admin interface for processing payouts
**File:** `/app/admin/affiliates/payouts/page.tsx`
**Features:**
- Pending payouts list
- Bulk selection
- Export for PayPal
- Mark as paid
- Add notes

**Acceptance Criteria:**
- [ ] Lists all pending
- [ ] Bulk operations work
- [ ] Export CSV format
- [ ] Updates statuses
- [ ] Sends notifications

#### **Story 8.2: Payout Processing API** ⏱ 2 hours
**Task:** Process payout batch
**File:** `/api/admin/affiliates/payouts/process/route.ts`
**Actions:**
```typescript
POST /api/admin/affiliates/payouts/process
- Validate admin permission
- Process selected payouts
- Generate invoice numbers
- Update statuses
- Send payment confirmations
```
**Acceptance Criteria:**
- [ ] Processes batch correctly
- [ ] Generates invoices
- [ ] Updates all records
- [ ] Sends confirmations
- [ ] Logs all actions

#### **Story 8.3: Payout Reports** ⏱ 1 hour
**Task:** Generate payout reports
**File:** `/api/admin/affiliates/reports/route.ts`
**Reports:**
- Monthly payout summary
- Tax report (1099)
- Affiliate earnings report
- Commission breakdown

**Acceptance Criteria:**
- [ ] Accurate calculations
- [ ] PDF generation
- [ ] CSV export
- [ ] Date range filtering
- [ ] Email delivery

### **Day 9: Commission Management**

#### **Story 9.1: Commission Hold System** ⏱ 2 hours
**Task:** Implement 30-day hold period
**File:** `/services/commission-hold.ts`
**Logic:**
```typescript
// Auto-approve after 30 days
// Handle refunds within hold
// Process approved commissions
// Notification on approval
```
**Acceptance Criteria:**
- [ ] 30-day hold works
- [ ] Auto-approval runs daily
- [ ] Refunds deduct properly
- [ ] Notifications sent
- [ ] Manual override option

#### **Story 9.2: Refund Handling** ⏱ 2 hours
**Task:** Handle refunds and chargebacks
**File:** Update `/api/webhooks/stripe/route.ts`
**Logic:**
```typescript
// On refund webhook:
1. Find related commission
2. Calculate clawback amount
3. Deduct from balance
4. Create adjustment record
5. Notify affiliate
```
**Acceptance Criteria:**
- [ ] Identifies commissions
- [ ] Calculates correctly
- [ ] Handles partial refunds
- [ ] Updates balances
- [ ] Sends notifications

---

## 🔧 **Phase 4: Advanced Features (3 days)**

### **Day 10: Performance & Tiers**

#### **Story 10.1: Affiliate Leaderboard** ⏱ 4 hours
**Task:** Create competitive leaderboard system
**Files:**
- `/app/affiliate/leaderboard/page.tsx`
- `/api/affiliate/leaderboard/route.ts`
- `/components/affiliate/LeaderboardWidget.tsx`

**Features:**
- Monthly earnings leaderboard
- All-time earnings leaderboard
- Most referrals leaderboard
- Highest conversion rate
- Achievement badges
- Anonymous/display name option
- Filter by time period

**Acceptance Criteria:**
- [ ] Real-time updates
- [ ] Top 10/25/50 display options
- [ ] Current user highlighted
- [ ] Privacy settings respected
- [ ] Mobile responsive design
- [ ] Export functionality for admins
- [ ] Motivational badges/achievements

#### **Story 10.2: Tier System Implementation** ⏱ 3 hours
**Task:** Implement performance tiers based on MRR
**File:** `/services/affiliate-tiers.ts`
**Tiers:**
- Standard: 20% for 24 months, then 10%
- Silver: 22% for 24 months, then 10% (requires $500/mo MRR)
- Gold: 25% for 24 months, then 10% (requires $1,500/mo MRR)
- Calculate based on 3-month average MRR
- Maximum 25% commission (no higher tiers)

**Acceptance Criteria:**
- [ ] Auto-upgrades work
- [ ] Rates apply correctly
- [ ] Notifications on change
- [ ] Manual override option
- [ ] Historical tracking

#### **Story 10.3: Performance Dashboard** ⏱ 2 hours
**Task:** Add performance metrics
**File:** `/components/affiliate/PerformanceMetrics.tsx`
**Metrics:**
- Conversion funnel
- Top performing links
- Revenue trends
- Comparative analysis

**Acceptance Criteria:**
- [ ] Charts display correctly
- [ ] Data is accurate
- [ ] Interactive tooltips
- [ ] Export functionality
- [ ] Mobile responsive

### **Day 11: Analytics & Reporting**

#### **Story 11.1: Advanced Analytics API** ⏱ 3 hours
**Task:** Create detailed analytics endpoint
**File:** `/api/affiliate/analytics/route.ts`
**Metrics:**
- Click-through rate
- Conversion rate by source
- Lifetime value of referrals
- Cohort analysis
- Geographic distribution

**Acceptance Criteria:**
- [ ] All metrics accurate
- [ ] Fast query performance
- [ ] Caching implemented
- [ ] Date range filtering
- [ ] Exportable data

#### **Story 11.2: Email Campaign Tracking** ⏱ 2 hours
**Task:** Track email campaign performance
**File:** `/services/campaign-tracking.ts`
**Features:**
- Campaign ID generation
- Open rate tracking
- Click tracking
- Conversion attribution

**Acceptance Criteria:**
- [ ] Tracks campaigns
- [ ] Links to conversions
- [ ] Reports generated
- [ ] Pixel tracking works
- [ ] GDPR compliant

### **Day 12: Automation & Optimization**

#### **Story 12.1: Automated Notifications** ⏱ 2 hours
**Task:** Set up automated emails
**Files:** `/services/affiliate-notifications.ts`
**Triggers:**
- First referral
- First conversion  
- Milestone reached
- Payout processed
- Tier upgrade

**Acceptance Criteria:**
- [ ] All triggers work
- [ ] Emails sent correctly
- [ ] Unsubscribe option
- [ ] Template customization
- [ ] Logs all sends

#### **Story 12.2: Fraud Detection** ⏱ 3 hours
**Task:** Implement fraud detection
**File:** `/services/fraud-detection.ts`
**Checks:**
- Multiple signups same IP
- Suspicious email patterns
- Rapid signup velocity
- Payment method issues
- Self-referral attempts

**Acceptance Criteria:**
- [ ] Flags suspicious activity
- [ ] Admin alerts sent
- [ ] Auto-hold option
- [ ] Manual review queue
- [ ] False positive handling

---

## 🧪 **Phase 5: Testing & Polish (2 days)**

### **Day 13: Testing**

#### **Story 13.1: Unit Tests** ⏱ 4 hours
**Task:** Write comprehensive unit tests
**Coverage:**
- Commission calculations
- Referral attribution
- Cookie handling
- Tier upgrades
- Payout validations

**Acceptance Criteria:**
- [ ] 80% code coverage
- [ ] All edge cases tested
- [ ] Mocking implemented
- [ ] Tests run in CI/CD
- [ ] Documentation updated

#### **Story 13.2: Integration Tests** ⏱ 3 hours
**Task:** Test end-to-end flows
**Scenarios:**
- Complete referral journey
- Payout request flow
- Refund handling
- Tier upgrades
- Admin workflows

**Acceptance Criteria:**
- [ ] All flows tested
- [ ] Database integrity
- [ ] API responses valid
- [ ] Error handling works
- [ ] Performance acceptable

### **Day 14: Documentation & Launch Prep**

#### **Story 14.1: Documentation** ⏱ 3 hours
**Task:** Create comprehensive docs
**Documents:**
- Affiliate guide
- API documentation
- Admin manual
- FAQ section
- Video tutorials

**Acceptance Criteria:**
- [ ] Complete coverage
- [ ] Screenshots included
- [ ] Examples provided
- [ ] Searchable format
- [ ] Version controlled

#### **Story 14.2: Launch Preparation** ⏱ 3 hours
**Task:** Prepare for launch
**Tasks:**
- Legal review
- Email templates
- Landing page
- Beta tester list
- Monitoring setup

**Acceptance Criteria:**
- [ ] Legal approved
- [ ] Templates tested
- [ ] Landing page live
- [ ] Beta users invited
- [ ] Alerts configured

---

## 📋 **Implementation Checklist**

### **Before Starting Development:**
- [ ] Review and approve this plan
- [ ] Set up test Stripe account
- [ ] Prepare legal documents
- [ ] Design email templates
- [ ] Create marketing materials

### **During Development:**
- [ ] Daily standup/progress check
- [ ] Test each story completion
- [ ] Update documentation
- [ ] Code review all PRs
- [ ] Deploy to staging first

### **Before Launch:**
- [ ] Security audit
- [ ] Performance testing
- [ ] Legal sign-off
- [ ] Beta testing complete
- [ ] Support team trained

---

## 🔥 **Quick Start Guide for Developers**

### **Day 1 Checklist:**
1. Read through entire plan
2. Set up local test data
3. Create database migrations
4. Implement Story 1.1-1.3
5. Deploy to staging

### **Key Files to Create:**
```
/app/affiliate/
  apply/page.tsx
  dashboard/page.tsx
  materials/page.tsx
  payouts/page.tsx
  
/app/admin/affiliates/
  page.tsx
  payouts/page.tsx
  
/api/affiliate/
  apply/route.ts
  stats/route.ts
  track/route.ts
  payouts/request/route.ts
  
/services/
  affiliate-tracking.ts
  commission.ts
  affiliate-tiers.ts
  fraud-detection.ts
  
/components/affiliate/
  LinkGenerator.tsx
  ReferralsList.tsx
  PerformanceMetrics.tsx
```

### **Testing Strategy:**
- Test each story in isolation
- Use test Stripe webhooks
- Create test affiliates
- Simulate full journey
- Monitor for edge cases

---

**End of Implementation Stories Document**