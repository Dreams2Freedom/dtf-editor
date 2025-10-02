# DTF Editor - Affiliate Program PRD & Implementation Plan

**Version:** 1.0  
**Date:** January 2025  
**Author:** DTF Editor Team  
**Status:** Planning Phase  

---

## 📋 **Executive Summary**

### **Purpose**
Implement a comprehensive affiliate program to drive user acquisition through partner referrals, reducing customer acquisition costs and leveraging word-of-mouth marketing.

### **Business Goals**
- Reduce customer acquisition cost (CAC) by 30%
- Increase monthly new user signups by 50%
- Create sustainable revenue-sharing model
- Build community of brand advocates

### **Success Metrics**
- Number of active affiliates
- Conversion rate from referral visits
- Average revenue per affiliate
- Customer lifetime value (LTV) of referred users
- Affiliate retention rate

---

## 🎯 **Business Requirements**

### **Commission Structure**

#### **Standard Tier (All Affiliates)**
- **Recurring Commission:** 20% of subscription revenue for 24 months, then 10% lifetime
- **One-time Purchase:** 20% of credit pack purchases
- **Cookie Duration:** 30 days
- **Minimum Payout:** $50
- **Payment Schedule:** Monthly (NET-30)

#### **Silver Tier**
- **Qualification:** Generate $500+/month in MRR
- **Recurring Commission:** 22% for 24 months, then 10% lifetime
- **One-time Purchase:** 22% of credit packs
- **Additional Benefits:** Priority support, custom referral links

#### **Gold Tier (Top Performers)**
- **Qualification:** Generate $1,500+/month in MRR
- **Recurring Commission:** 25% for 24 months, then 10% lifetime
- **One-time Purchase:** 25% of credit packs
- **Additional Benefits:** Dedicated support, custom marketing materials, leaderboard recognition
- **Maximum Commission Cap:** 25% (no higher tiers available)

#### **Special Programs**
- **Influencer Program:** Custom rates for 1000+ followers
- **Agency Program:** Volume-based tiering
- **Educational Discount:** 50% commission for educational content creators

### **Payment Methods**
- PayPal (primary method)
- Check (mailed monthly)

### **Tax Requirements**
- **US Affiliates:** W-9 form required before first payout
- **International Affiliates:** W-8BEN form required
- **Tax Reporting:** 1099-MISC issued for US affiliates earning $600+ annually
- **Compliance:** All tax documents must be completed and verified before payouts

---

## 👥 **User Personas**

### **Affiliate Persona 1: "Content Creator Carl"**
- **Background:** YouTube/TikTok creator in crafting/DTF niche
- **Motivation:** Monetize audience, provide value to followers
- **Needs:** Easy link sharing, branded materials, tracking dashboard
- **Volume:** 50-200 referrals/month

### **Affiliate Persona 2: "Blog Owner Betty"**
- **Background:** Runs crafting/printing blog
- **Motivation:** Passive income from existing content
- **Needs:** Deep links, banner ads, SEO-friendly content
- **Volume:** 20-50 referrals/month

### **Affiliate Persona 3: "Facebook Group Admin Frank"**
- **Background:** Manages DTF/crafting Facebook groups
- **Motivation:** Provide exclusive deals to members
- **Needs:** Group-specific codes, bulk discount options
- **Volume:** 100-500 referrals/month

---

## 🛠️ **Feature Requirements**

### **Core Features (MVP - Phase 1)**

#### **1. Affiliate Registration & Onboarding**
- Simple signup form (name, email, website/social media)
- Automatic approval for basic tier
- Manual review for premium tier
- Welcome email with getting started guide
- Affiliate agreement acceptance

#### **2. Referral Tracking**
- Unique referral codes (e.g., `dtfeditor.com?ref=CARL2025`)
- Custom vanity URLs (e.g., `dtfeditor.com/carl`)
- Cookie-based tracking (60-day attribution)
- Server-side tracking for accuracy
- Cross-device tracking via email matching

#### **3. Affiliate Dashboard**
- **Overview Stats:**
  - Total clicks, signups, conversions
  - Current month earnings
  - Lifetime earnings
  - Pending vs paid commissions
- **Referral Details:**
  - List of referred users
  - Conversion funnel (visit → signup → paid)
  - Individual referral status
- **Marketing Materials:**
  - Link generator
  - Banner/asset downloads
  - Email templates
  - Social media copy

#### **4. Commission Management**
- Automatic commission calculation
- Real-time earning updates
- Commission hold period (30 days for chargebacks)
- Refund/chargeback handling
- Tiered commission rates

#### **5. Payout System**
- Payout request interface
- Minimum payout threshold ($50)
- Payment method selection (PayPal or check)
- Tax form collection (W-9/W-8BEN) - REQUIRED before first payout
- Payout history and invoices

#### **6. Leaderboard & Competition**
- **Real-time Rankings:**
  - Top affiliates by monthly earnings
  - Most referrals this month
  - Highest conversion rate
  - Lifetime earnings leaders
- **Gamification:**
  - Achievement badges
  - Milestone rewards
  - Monthly contests
  - Public recognition
- **Privacy Options:**
  - Display name/alias option
  - Opt-out of public leaderboard
  - Private stats always available

### **Advanced Features (Phase 2)**

#### **6. Advanced Tracking**
- Sub-ID tracking for campaigns
- A/B testing for landing pages
- UTM parameter preservation
- Mobile app tracking (future)
- Offline conversion tracking

#### **7. Affiliate Tools**
- Deep linking to specific pages/features
- QR code generation
- Link cloaking service
- Conversion pixel for external tracking
- Postback URL support

#### **8. Performance Incentives**
- Bonus structure for milestones
- Contests and leaderboards
- Performance-based tier upgrades
- Exclusive affiliate events/webinars

#### **9. Communication Tools**
- In-app messaging system
- Newsletter for affiliates
- Automated performance alerts
- New feature announcements

---

## 💾 **Technical Architecture**

### **Database Schema**

```sql
-- Affiliates table
CREATE TABLE affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  referral_code VARCHAR(50) UNIQUE NOT NULL,
  vanity_url VARCHAR(100) UNIQUE,
  tier VARCHAR(20) DEFAULT 'standard',
  commission_rate_recurring DECIMAL(3,2) DEFAULT 0.20,
  commission_rate_onetime DECIMAL(3,2) DEFAULT 0.20,
  commission_rate_lifetime DECIMAL(3,2) DEFAULT 0.10, -- after 24 months
  mrr_generated DECIMAL(10,2) DEFAULT 0.00, -- for tier calculation
  mrr_3month_avg DECIMAL(10,2) DEFAULT 0.00, -- 3-month average
  status VARCHAR(20) DEFAULT 'pending',
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES profiles(id),
  payment_method JSONB,
  tax_form_type VARCHAR(20), -- 'W9', 'W8BEN'
  tax_form_completed BOOLEAN DEFAULT false,
  tax_form_data JSONB, -- encrypted
  tax_id VARCHAR(255), -- encrypted SSN/EIN
  display_name VARCHAR(100), -- for leaderboard
  leaderboard_opt_out BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Referrals table (tracks referred users)
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id),
  referred_user_id UUID REFERENCES profiles(id),
  referral_code VARCHAR(50),
  landing_page TEXT,
  utm_params JSONB,
  ip_address INET,
  user_agent TEXT,
  conversion_status VARCHAR(20) DEFAULT 'pending',
  signed_up_at TIMESTAMP,
  first_payment_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Referral visits (tracks all clicks)
CREATE TABLE referral_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id),
  referral_code VARCHAR(50),
  visitor_id VARCHAR(100), -- anonymous visitor tracking
  ip_address INET,
  user_agent TEXT,
  landing_page TEXT,
  utm_params JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Commissions table
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id),
  referral_id UUID REFERENCES referrals(id),
  transaction_id UUID REFERENCES transactions(id),
  type VARCHAR(20), -- 'subscription', 'onetime', 'bonus'
  amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, paid, cancelled
  commission_rate DECIMAL(3,2),
  base_amount DECIMAL(10,2), -- original transaction amount
  months_since_referral INTEGER DEFAULT 0, -- track 24-month period
  is_lifetime_rate BOOLEAN DEFAULT false, -- true after 24 months
  hold_until TIMESTAMP, -- 30-day hold period
  approved_at TIMESTAMP,
  paid_at TIMESTAMP,
  payout_id UUID REFERENCES payouts(id),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payouts table
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id),
  amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  method VARCHAR(20), -- 'paypal', 'bank', 'credit'
  status VARCHAR(20) DEFAULT 'pending',
  payment_details JSONB,
  processed_at TIMESTAMP,
  processor_response JSONB,
  invoice_number VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Affiliate materials (marketing assets)
CREATE TABLE affiliate_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200),
  type VARCHAR(50), -- 'banner', 'email', 'social', 'video'
  file_url TEXT,
  dimensions VARCHAR(20),
  description TEXT,
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Affiliate activity log
CREATE TABLE affiliate_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id),
  action VARCHAR(50),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **Tracking Implementation**

#### **Cookie Strategy**
```javascript
// Set affiliate cookie (30 days)
const setAffiliateCookie = (referralCode) => {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30);
  
  document.cookie = `dtf_ref=${referralCode}; ` +
    `expires=${expiryDate.toUTCString()}; ` +
    `path=/; domain=.dtfeditor.com; secure; samesite=lax`;
  
  // Also store in localStorage as backup
  localStorage.setItem('dtf_ref', JSON.stringify({
    code: referralCode,
    timestamp: Date.now(),
    landingPage: window.location.href,
    utm: getUTMParams()
  }));
};
```

#### **Server-Side Tracking**
```typescript
// Track referral on user signup
const trackReferral = async (userId: string, req: Request) => {
  const referralCode = 
    req.cookies.dtf_ref || 
    req.query.ref || 
    req.headers['x-referral-code'];
  
  if (referralCode) {
    const affiliate = await getAffiliateByCode(referralCode);
    if (affiliate) {
      await createReferral({
        affiliate_id: affiliate.id,
        referred_user_id: userId,
        referral_code: referralCode,
        landing_page: req.headers.referer,
        utm_params: extractUTMParams(req.query),
        ip_address: getClientIP(req),
        user_agent: req.headers['user-agent']
      });
    }
  }
};
```

---

## 📊 **User Stories & Acceptance Criteria**

### **Epic 1: Affiliate Onboarding**

#### **Story 1.1: User applies to become affiliate**
**As a** user  
**I want to** apply to become an affiliate  
**So that** I can earn commissions from referrals  

**Acceptance Criteria:**
- [ ] Application form accessible from dashboard
- [ ] Required fields: website/social media, promotion method
- [ ] Optional fields: audience size, content examples
- [ ] Affiliate agreement must be accepted
- [ ] Confirmation email sent upon submission
- [ ] Application visible in admin panel

#### **Story 1.2: Admin reviews affiliate application**
**As an** admin  
**I want to** review and approve affiliate applications  
**So that** I can maintain quality affiliates  

**Acceptance Criteria:**
- [ ] Admin can view pending applications
- [ ] Can see applicant's profile and history
- [ ] Can approve/reject with notes
- [ ] Approval triggers welcome email
- [ ] Rejection triggers feedback email
- [ ] Bulk approval options available

### **Epic 2: Referral Tracking**

#### **Story 2.1: Affiliate shares referral link**
**As an** affiliate  
**I want to** generate and share referral links  
**So that** I can track my referrals  

**Acceptance Criteria:**
- [ ] Generate links from dashboard
- [ ] Copy link with one click
- [ ] Add UTM parameters optionally
- [ ] Create short/vanity URLs
- [ ] QR code generation
- [ ] Track link performance

#### **Story 2.2: System tracks referral visits**
**As the** system  
**I want to** track all referral visits  
**So that** affiliates get credited properly  

**Acceptance Criteria:**
- [ ] Cookie set on referral link visit
- [ ] 30-day cookie duration
- [ ] Cross-device tracking via email
- [ ] Track landing pages
- [ ] Record UTM parameters
- [ ] Handle multiple referral sources

### **Epic 3: Commission Management**

#### **Story 3.1: Calculate commissions automatically**
**As the** system  
**I want to** calculate commissions automatically  
**So that** affiliates see real-time earnings  

**Acceptance Criteria:**
- [ ] Calculate on successful payment
- [ ] Apply correct commission rate
- [ ] Handle subscription vs one-time
- [ ] Account for refunds/chargebacks
- [ ] Apply tier bonuses
- [ ] Update in real-time

#### **Story 3.2: Affiliate views earnings**
**As an** affiliate  
**I want to** view my earnings and performance  
**So that** I can optimize my promotion  

**Acceptance Criteria:**
- [ ] Dashboard shows current earnings
- [ ] Breakdown by time period
- [ ] Pending vs approved amounts
- [ ] Conversion funnel metrics
- [ ] Top performing content/links
- [ ] Export reports as CSV

### **Epic 4: Payout Processing**

#### **Story 4.1: Request payout**
**As an** affiliate  
**I want to** request payout of earnings  
**So that** I receive my commissions  

**Acceptance Criteria:**
- [ ] Request button when > $50 available
- [ ] Choose payment method
- [ ] See estimated arrival date
- [ ] Receive confirmation email
- [ ] View payout history
- [ ] Download invoices

#### **Story 4.2: Process payouts**
**As an** admin  
**I want to** process affiliate payouts  
**So that** affiliates get paid timely  

**Acceptance Criteria:**
- [ ] View pending payouts queue
- [ ] Bulk approve/process
- [ ] Export for PayPal mass payment
- [ ] Mark as paid with proof
- [ ] Handle failed payments
- [ ] Generate tax reports

---

## 🚨 **Edge Cases & Business Rules**

### **Attribution Rules**
1. **Last-click attribution:** Most recent referral code wins
2. **Self-referral prevention:** Users cannot use own code
3. **Existing user check:** No commission for existing users
4. **Employee exclusion:** Staff accounts cannot earn commissions
5. **Cross-device tracking:** Match by email if available

### **Commission Rules**
1. **Hold period:** 30 days before approval (chargebacks)
2. **Refund handling:** Clawback commission on full refunds
3. **Partial refunds:** Adjust commission proportionally
4. **Plan changes:** Adjust recurring commission on upgrade/downgrade
5. **Subscription cancellation:** Stop future commissions
6. **Commission duration:** Full rate for 24 months, then 10% lifetime
7. **Tax compliance:** W-9/W-8BEN must be on file before first payout
8. **Bonus cap:** Maximum 5% additional commission from all bonuses combined
9. **Tier evaluation:** Based on trailing 3-month MRR average

### **Fraud Prevention**
1. **IP filtering:** Flag multiple signups from same IP
2. **Email validation:** Verify email domains
3. **Payment method:** Flag suspicious payment patterns
4. **Velocity checks:** Limit signups per hour/day
5. **Manual review:** High-value transactions
6. **Affiliate suspension:** Temporary hold for investigation

### **Special Scenarios**
1. **Coupon stacking:** Referral + coupon = lower commission
2. **Free trials:** Commission on conversion, not signup
3. **Gift subscriptions:** Commission to original referrer
4. **Account transfers:** Maintain referral connection
5. **Reactivation:** Resume commissions if user returns

---

## 📈 **Implementation Phases**

### **Phase 1: Foundation (Week 1)**
- Database schema setup
- Basic affiliate registration
- Referral link generation
- Cookie tracking implementation
- Admin approval interface

### **Phase 2: Tracking (Week 2)**
- Visit tracking system
- Conversion tracking
- Commission calculation
- Basic affiliate dashboard
- Real-time statistics

### **Phase 3: Management (Week 3)**
- Commission management
- Payout request system
- Admin payout processing
- Email notifications
- Basic reporting

### **Phase 4: Enhancement (Week 4)**
- Marketing materials library
- Advanced analytics
- Tier system
- Fraud detection
- API for external tools

### **Phase 5: Optimization (Ongoing)**
- A/B testing
- Performance optimization
- Mobile app
- Integrations (Zapier, etc.)
- Advanced features

---

## 📝 **Testing Strategy**

### **Unit Tests**
- Commission calculation accuracy
- Cookie setting/reading
- Referral attribution logic
- Payout threshold checks
- Fraud detection rules

### **Integration Tests**
- End-to-end referral flow
- Payment webhook handling
- Email notification delivery
- Database transaction integrity
- API endpoint security

### **User Acceptance Tests**
- Affiliate signup flow
- Link generation and sharing
- Dashboard data accuracy
- Payout request process
- Admin management tools

### **Performance Tests**
- High traffic handling
- Concurrent commission calculations
- Dashboard loading speed
- Database query optimization
- Cache effectiveness

---

## 🔒 **Security Considerations**

1. **Data Protection**
   - Encrypt sensitive payment data
   - PCI compliance for payment info
   - GDPR compliance for EU affiliates
   - Secure API endpoints

2. **Fraud Prevention**
   - Rate limiting on signups
   - Captcha on registration
   - Email verification required
   - Manual review triggers

3. **Access Control**
   - Role-based permissions
   - Secure admin functions
   - Audit logging
   - Session management

---

## 📊 **Success Metrics & KPIs**

### **Primary Metrics**
- **Affiliate Growth Rate:** Target 50 new affiliates/month
- **Active Affiliate Rate:** Target 40% monthly active
- **Referral Conversion Rate:** Target 15% signup to paid
- **Average Revenue per Affiliate:** Target $200/month
- **CAC Reduction:** Target 30% lower via referrals

### **Secondary Metrics**
- Click-through rate from referral links
- Time to first referral
- Affiliate lifetime value
- Payout processing time
- Support ticket volume

---

## 🚀 **Launch Strategy**

### **Beta Launch (Week 1-2)**
- Invite 10-20 select partners
- Gather feedback on interface
- Test payout processes
- Refine commission structure
- Fix critical issues

### **Soft Launch (Week 3-4)**
- Open to all existing users
- Limited promotion
- Monitor for issues
- Optimize based on data
- Prepare marketing materials

### **Full Launch (Week 5+)**
- Public announcement
- Email campaign to users
- Social media promotion
- Influencer outreach
- Press release

---

## 📚 **Documentation Requirements**

1. **Affiliate Guide**
   - Getting started
   - Best practices
   - FAQ section
   - Video tutorials

2. **API Documentation**
   - Webhook specs
   - Tracking pixel
   - Postback URLs
   - Rate limits

3. **Legal Documents**
   - Affiliate agreement
   - Terms of service updates
   - Privacy policy updates
   - Tax documentation

---

## 🔄 **Post-Launch Iterations**

### **Month 1-2**
- Fix critical bugs
- Optimize conversion funnel
- Improve dashboard UX
- Add requested features

### **Month 3-4**
- Implement tier system
- Add advanced analytics
- Launch mobile app
- Integrate with tools

### **Month 5-6**
- International expansion
- Multi-currency support
- Advanced fraud detection
- API marketplace

---

## 📎 **Appendix**

### **Competitive Analysis**
- **Rewardful:** Simple SaaS-focused, 30% commission standard
- **Post Affiliate Pro:** Complex, expensive, feature-rich
- **Tapfiliate:** Good tracking, moderate complexity
- **FirstPromoter:** Developer-friendly, good API

### **Technology Stack**
- **Frontend:** Next.js, React, TypeScript
- **Backend:** Supabase, PostgreSQL
- **Payments:** Stripe, PayPal API
- **Analytics:** Custom + Google Analytics
- **Email:** SendGrid

### **Resource Requirements**
- **Development:** 1 full-stack developer (4 weeks)
- **Design:** UI/UX updates (1 week)
- **Testing:** QA testing (ongoing)
- **Marketing:** Launch materials (2 weeks)
- **Support:** Documentation and training (1 week)

---

**Document Version History:**
- v1.0 - Initial comprehensive plan (January 2025)

**Next Steps:**
1. Review and approve PRD
2. Finalize commission structure
3. Begin Phase 1 development
4. Prepare legal documents
5. Identify beta testers