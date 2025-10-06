# Stripe Test Mode Deployment Plan for DTFEditor.com

**Created:** August 3, 2025  
**Purpose:** Test all payment flows in production environment before going live

## 🧪 Test Mode Deployment Strategy

### Phase 1: Deploy with Test Keys ✅

Use your existing Stripe TEST mode keys for initial production deployment:

- All payment flows will work exactly like production
- Use Stripe test cards for testing
- No real money will be charged
- Perfect for thorough testing

### Phase 2: Comprehensive Testing

Test every payment scenario before switching to live mode

### Phase 3: Switch to Live Mode

Simple environment variable update when ready

## 📋 Stripe Test Mode Configuration

### Environment Variables for Test Mode

```env
# Use these TEST keys for initial deployment
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51Rl8bgPHFzf1GpIrGtRWiO99fFOaVQZ1PDc4vlR90STU2EuRi6sZK2pHbhNphsv7zwJWhLITBExCdXGdQNti2FQX00jHL7NnCV
STRIPE_SECRET_KEY=[Your test secret key from .env.local]
STRIPE_WEBHOOK_SECRET=[Will be generated from TEST webhook]

# Price IDs (TEST MODE)
STRIPE_BASIC_PLAN_PRICE_ID=price_1RleoYPHFzf1GpIrfy9RVk9m
STRIPE_STARTER_PLAN_PRICE_ID=price_1RlepVPHFzf1GpIrjRiKHtvb
STRIPE_PAYG_10_CREDITS_PRICE_ID=price_1RqCymPHFzf1GpIr6L0Ec4cH
STRIPE_PAYG_20_CREDITS_PRICE_ID=price_1RqCzZPHFzf1GpIrF2EBwBnm
STRIPE_PAYG_50_CREDITS_PRICE_ID=price_1RqD0QPHFzf1GpIrcAqSHy0u
```

### Test Webhook Setup

1. In Stripe Dashboard (TEST mode):
   - Add endpoint: `https://dtfeditor.com/api/webhooks/stripe`
   - Same events as production
   - Copy the TEST webhook signing secret

## 🧪 Comprehensive Test Checklist

### 1. User Registration & Free Tier

- [ ] New user signup
- [ ] Verify 2 free credits allocated
- [ ] Verify welcome email sent
- [ ] Test free tier limitations

### 2. Subscription Testing

#### Basic Plan ($19.99/month)

- [ ] Subscribe using test card `4242 4242 4242 4242`
- [ ] Verify 20 credits allocated
- [ ] Check subscription appears in dashboard
- [ ] Verify confirmation email sent
- [ ] Test in Stripe dashboard

#### Starter Plan ($49.99/month)

- [ ] Subscribe using test card
- [ ] Verify 60 credits allocated
- [ ] Check subscription status
- [ ] Verify email confirmation

#### Plan Upgrades/Downgrades

- [ ] Upgrade from Basic to Starter
- [ ] Verify credit adjustment (40 additional credits)
- [ ] Downgrade from Starter to Basic
- [ ] Verify proration works correctly

### 3. Pay-As-You-Go Credits

#### 10 Credits ($7.99)

- [ ] Purchase using test card
- [ ] Verify credits added immediately
- [ ] Check purchase history
- [ ] Verify email receipt

#### 20 Credits ($14.99)

- [ ] Purchase and verify
- [ ] Test with different test cards

#### 50 Credits ($34.99)

- [ ] Purchase and verify
- [ ] Test bulk credit addition

### 4. Subscription Management

#### Cancellation Flow

- [ ] Test cancel button
- [ ] Verify retention offer appears (50% discount)
- [ ] Test accepting discount
- [ ] Test declining and canceling
- [ ] Verify cancellation email

#### Pause Subscription

- [ ] Pause for 2 weeks
- [ ] Pause for 1 month
- [ ] Pause for 2 months
- [ ] Verify pause confirmation
- [ ] Test resume functionality

#### Customer Portal

- [ ] Access billing portal
- [ ] Update payment method
- [ ] Download invoices
- [ ] View billing history

### 5. Edge Cases & Error Handling

#### Payment Failures

- [ ] Test with declining card: `4000 0000 0000 0002`
- [ ] Test insufficient funds: `4000 0000 0000 9995`
- [ ] Verify error messages
- [ ] Check credit rollback on failures

#### Webhook Testing

- [ ] Verify webhook receives events
- [ ] Check database updates
- [ ] Monitor for duplicate processing
- [ ] Test webhook retry logic

#### International Payments

- [ ] Test with international test cards
- [ ] Verify currency conversion
- [ ] Check tax calculations (if applicable)

### 6. Credit System Testing

#### Credit Consumption

- [ ] Process image with each service
- [ ] Verify correct credit deduction
- [ ] Test insufficient credits warning
- [ ] Verify credit refund on errors

#### Credit Expiration

- [ ] Test 6-month expiration display
- [ ] Verify expiration warnings
- [ ] Test FIFO credit usage

### 7. Admin Dashboard Testing

- [ ] View payment analytics
- [ ] Check revenue reports
- [ ] Test manual credit adjustments
- [ ] Verify audit logs for payments

## 📝 Test Cards Reference

### Successful Payment Cards

- `4242 4242 4242 4242` - Visa (Most common)
- `5555 5555 5555 4444` - Mastercard
- `3782 822463 10005` - Amex

### Error Testing Cards

- `4000 0000 0000 0002` - Card declined
- `4000 0000 0000 9995` - Insufficient funds
- `4000 0000 0000 0069` - Expired card
- `4000 0000 0000 0127` - Incorrect CVC

### 3D Secure Testing

- `4000 0027 6000 3184` - Requires authentication

Use any future date for expiry, any 3 digits for CVC, any 5 digits for ZIP.

## 🔄 Transition to Live Mode

### Pre-Live Checklist

- [ ] All test scenarios pass
- [ ] No critical bugs found
- [ ] Email delivery working
- [ ] Customer portal functional
- [ ] Webhook processing reliable
- [ ] Error handling tested

### Steps to Go Live

1. **In Stripe Dashboard:**
   - Switch to Live mode
   - Create live webhook endpoint
   - Copy live API keys
   - Verify products/prices exist in live mode

2. **In Vercel:**
   - Update to LIVE Stripe keys:
     - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
     - `STRIPE_SECRET_KEY`
     - `STRIPE_WEBHOOK_SECRET`
   - Redeploy application

3. **Post-Live Verification:**
   - Make small real purchase
   - Verify webhook processing
   - Check email delivery
   - Monitor for any errors

## 📊 Test Results Documentation

### Test Session 1

Date: \***\*\_\_\_\*\***
Tester: \***\*\_\_\_\*\***

| Test Case            | Result          | Notes |
| -------------------- | --------------- | ----- |
| User Signup          | ⬜ Pass ⬜ Fail |       |
| Basic Plan Subscribe | ⬜ Pass ⬜ Fail |       |
| Credit Purchase      | ⬜ Pass ⬜ Fail |       |
| Cancellation         | ⬜ Pass ⬜ Fail |       |

### Issues Found

1. Issue: \***\*\_\_\_\*\***
   - Severity: High/Medium/Low
   - Resolution: \***\*\_\_\_\*\***

## 🚨 Important Notes

1. **Test Mode Indicators:**
   - Stripe dashboard will show "TEST MODE"
   - Receipts will indicate test payments
   - No real charges will occur

2. **Data Considerations:**
   - Test mode data is separate from live mode
   - Customer records don't transfer
   - Subscriptions need recreation in live mode

3. **Timeline:**
   - Spend 1-2 days thoroughly testing
   - Fix any issues found
   - Switch to live mode when confident

## ✅ Ready for Test Deployment!

Deploy with test keys first, thoroughly test everything, then switch to live mode with confidence!
