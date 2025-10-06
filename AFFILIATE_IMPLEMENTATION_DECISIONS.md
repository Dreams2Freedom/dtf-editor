# Affiliate Program Implementation Decisions

**Date:** January 2025
**Purpose:** Final business decisions for affiliate program implementation

---

## 🔴 **Tax & Legal Infrastructure**

### **W-9/W-8BEN Collection**

**Solution:** Implement secure form collection through Supabase

- Create encrypted `tax_forms` table in Supabase
- Use Supabase Vault for encryption-at-rest
- Build in-app tax form collection UI
- Store encrypted SSN/EIN in `tax_id` column
- PDF generation for record keeping

### **1099 Generation**

**Solution:** ADP integration for tax reporting

- Export affiliate payment data to ADP
- ADP handles 1099-MISC generation and filing
- Annual export in January for previous year

### **PayPal Business Account**

**Status:** ✅ Already configured for mass payouts

### **Check Processing**

**Solution:** Internal handling

- Generate check requests from admin panel
- Print and mail checks internally
- Track check numbers in database

---

## 💳 **Payment Processing**

### **PayPal API**

**Action:** Obtain API credentials for PayPal Payouts API

- Use sandbox for testing
- Production credentials before launch

### **Payout Schedule**

**Decision:** Manual monthly payouts

- Run on 1st of each month
- Process all affiliates above $50 threshold
- Admin initiates payout batch
- Email notifications upon completion

### **International Payments**

**Decision:** Accept international affiliates

- PayPal handles currency conversion
- Affiliates bear PayPal fees
- Clear fee disclosure in agreement

### **Negative Balance Recovery**

**Implementation:** Clawback system

- Automatic deduction from future earnings
- Email notification of negative balance
- 30-day grace period for repayment
- Legal action for balances > $100
- Add strong language to affiliate agreement

---

## 🔒 **Security Implementation**

### **SSN/Tax ID Storage**

**Solution:** Supabase Vault encryption

```sql
-- Use Supabase Vault for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt sensitive fields
UPDATE affiliates
SET tax_id = pgp_sym_encrypt(tax_id, current_setting('app.encryption_key'))
WHERE tax_id IS NOT NULL;
```

### **PCI Compliance**

**Solution:** No payment data stored locally

- PayPal handles all payment information
- We only store PayPal email addresses
- No credit card data in our database

### **Fraud Detection Rules**

1. **Self-referral blocking:**
   - Check email match on signup
   - Check IP address match
   - Block same payment method
2. **Rate limiting:**
   - Max 100 clicks/day per affiliate
   - Max 20 signups/day per affiliate
   - Alert on unusual patterns

---

## 📊 **Analytics & Reporting**

### **Phase 1 (MVP):** Basic reporting only

- Click counts
- Conversion counts
- Commission totals

### **Phase 2 (Future):**

- Google Analytics integration
- UTM parameter tracking
- Advanced conversion analytics
- PDF report generation

---

## 🚦 **Launch Strategy**

### **Beta Launch Plan**

1. **Week 1-2:** Internal testing with 5 test affiliates
2. **Week 3-4:** Beta with 10-20 selected affiliates
3. **Week 5:** Full launch to all users

### **Existing Users**

- Grandfather into refer-a-friend program only
- Must apply for full affiliate program
- No automatic migration

### **Rollback Plan**

```bash
# Database backup before launch
pg_dump > backup_before_affiliate_launch.sql

# Feature flag for quick disable
ENABLE_AFFILIATE_PROGRAM=false
```

---

## 📧 **Email Communications**

### **Email Templates Required**

1. **Application Received**
   - Subject: "Affiliate Application Received"
   - Confirm receipt, set expectations

2. **Approval Email**
   - Subject: "Welcome to DTF Editor Affiliate Program!"
   - Getting started guide, referral link

3. **Rejection Email**
   - Subject: "Affiliate Application Update"
   - Polite rejection, reapplication info

4. **New Conversion**
   - Subject: "You've earned a commission!"
   - Details of conversion, amount earned

5. **Payout Processed**
   - Subject: "Your commission payment is on the way"
   - Payment method, amount, tracking

6. **Monthly Summary**
   - Subject: "Your Monthly Affiliate Report"
   - Stats, earnings, tips

---

## 🎯 **Business Rules**

### **Referral Rules**

- **Self-purchase:** ❌ Blocked (IP and email checking)
- **Coupon stacking:** ✅ Allowed (max 50% off first month)
- **Retroactive attribution:** ✅ User can assign affiliate post-signup
- **Email changes:** ✅ Attribution follows user ID, not email
- **Downgrades:** Commissions adjust proportionally

### **Auto-Approval Logic**

**Auto-approve if ALL conditions met:**

- Valid website/social media provided
- No suspicious patterns detected
- Tax form completed
- Not flagged country/region

**Flag for manual review if:**

- No website/social presence
- Suspicious email domain
- High-risk country
- Previous fraud history

---

## 🛠️ **Technical Clarifications**

### **Credit System Compatibility**

**No Conflict:** Affiliate credits are separate from user credits

- Affiliate earns commission in dollars
- Can use commission for credit purchases
- Credits given as prizes don't affect user credits

### **Stripe Webhook Modifications**

**Required Changes:**

```javascript
// In stripe webhook handler
case 'payment_intent.succeeded':
  // Existing payment processing
  await processPayment(event);

  // NEW: Trigger commission calculation
  await calculateAffiliateCommission(event);
  break;

case 'charge.refunded':
  // NEW: Reverse affiliate commission
  await reverseAffiliateCommission(event);
  break;
```

### **Database Backup Strategy**

```bash
# Daily automated backups
0 2 * * * pg_dump production > /backups/daily/$(date +\%Y\%m\%d).sql

# Before major changes
pg_dump production > /backups/pre-affiliate-launch.sql
```

### **Infrastructure Capacity**

**Current limits are sufficient for MVP:**

- Supabase: 500M rows (plenty for tracking)
- API calls: 1M/month (sufficient for MVP)
- Storage: 100GB (minimal affiliate data)

---

## 📱 **MVP vs Full Implementation**

### **Phase 1 MVP (Weeks 1-4)**

✅ **Included:**

- Application system with auto-approval
- Basic affiliate dashboard
- Referral link generation
- Cookie tracking (30 days)
- Manual commission calculation
- Manual PayPal payouts
- Basic email notifications
- Fraud prevention basics

❌ **Not Included:**

- Leaderboards
- Gamification/badges
- Advanced analytics
- Automated payouts
- API access

### **Phase 2 (Months 2-3)**

- Automated PayPal payouts
- Leaderboards
- Achievement system
- Points/rewards
- Advanced analytics
- Promotional materials

---

## 🔄 **Operational Processes**

### **Application Review**

- 95% auto-approved instantly
- 5% flagged for manual review
- Review queue in admin panel
- 24-hour review SLA

### **Dispute Resolution**

- All disputes via support ticket
- 48-hour response time
- Commission holds during dispute
- Final decision per agreement terms

### **Support Integration**

- Add "Affiliate Support" category to existing system
- Same support flow as regular tickets
- Dedicated FAQ section
- Priority support for Gold tier affiliates

---

## ✅ **Pre-Launch Checklist**

### **Technical Setup**

- [ ] Create database tables and migrations
- [ ] Implement tax form encryption
- [ ] Set up PayPal API integration
- [ ] Build affiliate dashboard UI
- [ ] Create admin management panel
- [ ] Implement cookie tracking
- [ ] Add fraud detection rules
- [ ] Create email templates
- [ ] Set up commission calculation

### **Business Setup**

- [ ] Obtain PayPal API credentials
- [ ] Configure ADP for 1099s
- [ ] Create affiliate FAQ
- [ ] Train support team
- [ ] Set up affiliates@dtfeditor.com
- [ ] Prepare marketing materials
- [ ] Select beta testers

### **Legal/Compliance**

- [ ] Finalize affiliate agreement
- [ ] Add clawback provisions
- [ ] Create terms of service updates
- [ ] Prepare tax documentation
- [ ] Review with legal counsel

---

## 🚀 **Implementation Priority**

### **Week 1:** Foundation

- Database schema
- Basic models and API routes
- Application form
- Auto-approval logic

### **Week 2:** Tracking

- Cookie implementation
- Referral attribution
- Click tracking
- Conversion tracking

### **Week 3:** Dashboard

- Affiliate dashboard UI
- Stats and metrics
- Referral link generator
- Admin panel

### **Week 4:** Payments

- Commission calculation
- Payout interface
- Tax form collection
- Email notifications

---

**END OF IMPLEMENTATION DECISIONS**
