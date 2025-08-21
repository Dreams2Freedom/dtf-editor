# DTF Editor Pricing Structure

**Last Updated:** August 20, 2025

## 📊 Official Pricing Tiers

### 🆓 Free Plan
- **Price:** $0/month
- **Credits:** 2 credits per month (refresh monthly)
- **Storage:** 48 hours
- **Features:**
  - ✅ Image Upscaling
  - ✅ Background Removal
  - ✅ Vectorization
  - ✅ Free DPI Checker Tool
  - ❌ AI Image Generation (paid only)
  - ❌ AI Image Editing (paid only)
- **Support:** Community support

### 🚀 Starter Plan
- **Price:** $9.99/month
- **Credits:** 20 credits per month
- **Storage:** Unlimited while subscribed
- **Features:**
  - ✅ All Free Plan features
  - ✅ AI Image Generation
  - ✅ AI Image Editing
  - ✅ No watermarks
  - ✅ Gallery with search/filter
  - ✅ Bulk operations
- **Support:** Email support
- **Best for:** Hobbyists and occasional users

### 💎 Pro Plan
- **Price:** $19.99/month
- **Credits:** 50 credits per month
- **Storage:** Unlimited while subscribed
- **Features:**
  - ✅ All Starter Plan features
  - ✅ Priority processing queue
  - ✅ Batch processing
  - ✅ Advanced export options
  - ✅ Early access to new features
- **Support:** Priority support
- **Best for:** Small businesses and regular users

### 💳 Pay-As-You-Go Credit Packs
No subscription required - buy credits when you need them:

| Pack Size | Price | Per Credit | Savings |
|-----------|-------|------------|---------|
| 10 Credits | $7.99 | $0.80 | - |
| 20 Credits | $14.99 | $0.75 | Save 6% |
| 50 Credits | $29.99 | $0.60 | Save 25% |

- **Credit Expiration:** Never expire
- **Storage:** 90 days from last purchase
- **Features:** Same as Starter Plan

## 💰 Credit Usage

### Processing Costs
- **Background Removal:** 1 credit
- **Image Upscaling:** 1 credit
- **Vectorization:** 1 credit
- **AI Image Generation (Beta - Standard):** 1 credit
- **AI Image Generation (Beta - HD):** 2 credits
- **AI Image Editing (Beta):** 1 credit
- **Free DPI Checker:** 0 credits (always free)

### Credit Policies
- **Monthly Credits:** Don't roll over (use them or lose them)
- **Purchased Credits:** Never expire
- **Refunds:** Automatic refund if processing fails
- **7-Day Guarantee:** New subscribers can get full refund within 7 days

## 🔄 Subscription Management

### Billing
- **Cycle:** Monthly on the same date you subscribed
- **Payment Methods:** All major credit/debit cards via Stripe
- **Auto-renewal:** Yes, can be cancelled anytime
- **Proration:** Yes, when upgrading/downgrading

### Cancellation
- **When:** Cancel anytime from account settings
- **Access:** Keep access until end of billing period
- **Credits:** Use remaining credits before period ends
- **Storage:** Images remain for 30 days after cancellation

### Upgrades/Downgrades
- **Upgrade:** Immediate access to new plan features
- **Downgrade:** Takes effect at next billing cycle
- **Credit Adjustment:** Prorated based on days remaining

## 🎯 Stripe Product IDs

### Live Mode Products
```javascript
// Subscription Plans
STARTER_PLAN_PRICE_ID: 'price_starter_monthly_999'
PRO_PLAN_PRICE_ID: 'price_pro_monthly_1999'

// Pay-As-You-Go Credit Packs
CREDITS_10_PRICE_ID: 'price_credits_10_799'
CREDITS_20_PRICE_ID: 'price_credits_20_1499'
CREDITS_50_PRICE_ID: 'price_credits_50_2999'
```

### Test Mode Products
```javascript
// Use same structure with test_ prefix
TEST_STARTER_PLAN_PRICE_ID: 'price_test_starter_monthly_999'
// ... etc
```

## 📈 Pricing Strategy Notes

### Value Proposition
- **Free Plan:** Try before you buy, minimal commitment
- **Starter:** Best value for regular hobbyists
- **Pro:** Premium features for power users
- **Pay-As-You-Go:** Flexibility for occasional users

### Competitive Analysis
- Priced below Adobe Creative Cloud ($20-55/month)
- Competitive with Canva Pro ($12.99/month)
- Better value than individual API access
- Includes storage and support unlike raw API access

### Future Considerations
- Annual plans with 20% discount (planned)
- Team/Business plans (under consideration)
- Educational discounts (potential)
- Affiliate program rates (TBD)

## 🚨 Important Implementation Notes

1. **Always use these exact prices** in:
   - Frontend pricing display
   - Stripe product configuration
   - FAQ and documentation
   - Marketing materials

2. **Credit calculations** must match:
   - Database credit tracking
   - Stripe metadata
   - User dashboard display

3. **Storage rules** are enforced by:
   - Cron jobs for free user cleanup (48 hours)
   - Account status checks for paid users
   - Grace period after cancellation (30 days)

4. **Refund policy** requirements:
   - 7-day money-back guarantee for new subscribers
   - Automatic credit refund on processing failure
   - No refunds for successfully used credits
   - Pro-rated refunds for annual plans (when launched)

---

**Note:** This is the single source of truth for pricing. Any changes must be:
1. Approved by business owner
2. Updated in Stripe dashboard
3. Reflected in code constants
4. Communicated to existing users