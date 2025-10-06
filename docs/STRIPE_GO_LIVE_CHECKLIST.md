# Stripe Go-Live Checklist

## 🚀 Steps to Switch from Test to Live Mode

### 1. Prerequisites

- [ ] Stripe account verified and approved for live payments
- [ ] Business details completed in Stripe Dashboard
- [ ] Bank account connected for payouts
- [ ] Tax settings configured (if applicable)

### 2. Create Live Products and Prices in Stripe Dashboard

Navigate to https://dashboard.stripe.com and switch to **Live mode**.

Create the following products and prices:

#### Subscription Plans

- [ ] **Basic Plan** - $4.99/month
  - 20 credits per month
  - Note the `price_xxx` ID
- [ ] **Starter Plan** - $14.99/month
  - 60 credits per month
  - Note the `price_xxx` ID

#### Pay-As-You-Go Packages

- [ ] **5 Credits Pack** - $2.49
  - One-time purchase
  - Note the `price_xxx` ID
- [ ] **10 Credits Pack** - $4.49
  - One-time purchase
  - Note the `price_xxx` ID
- [ ] **20 Credits Pack** - $7.99
  - One-time purchase
  - Note the `price_xxx` ID

### 3. Update Environment Variables

Update your `.env.local` file with live keys:

```bash
# Replace test keys with live keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxx  # (was pk_test_)
STRIPE_SECRET_KEY=sk_live_xxxx                   # (was sk_test_)

# Update with live price IDs from step 2
STRIPE_BASIC_PLAN_PRICE_ID=price_live_basic_xxx
STRIPE_STARTER_PLAN_PRICE_ID=price_live_starter_xxx
STRIPE_PAY_AS_YOU_GO_PACK5_PRICE_ID=price_live_5pack_xxx
STRIPE_PAY_AS_YOU_GO_PACK10_PRICE_ID=price_live_10pack_xxx
STRIPE_PAY_AS_YOU_GO_PACK20_PRICE_ID=price_live_20pack_xxx
```

### 4. Configure Webhook Endpoint

1. Go to https://dashboard.stripe.com/webhooks (in Live mode)
2. Click "Add endpoint"
3. Set endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for:
   - [ ] `checkout.session.completed`
   - [ ] `customer.subscription.created`
   - [ ] `customer.subscription.updated`
   - [ ] `customer.subscription.deleted`
   - [ ] `invoice.payment_succeeded`
   - [ ] `invoice.payment_failed`
   - [ ] `payment_intent.succeeded`
   - [ ] `payment_intent.payment_failed`
5. Copy the signing secret and update:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_live_xxx
   ```

### 5. Update Vercel Environment Variables

```bash
# Push all environment variables to Vercel
node scripts/prepare-vercel-env.js

# Or manually in Vercel Dashboard:
# https://vercel.com/[your-team]/[your-project]/settings/environment-variables
```

### 6. Test Live Mode

Run the verification script to ensure live keys work:

```bash
node scripts/verify-api-keys.js
```

Expected output should show:

- ✅ Stripe API: Mode: LIVE

### 7. Perform Test Transactions

⚠️ **These will be real charges - use a small amount and refund after testing**

1. **Test Subscription Purchase**:
   - Create a test account
   - Purchase Basic Plan ($4.99)
   - Verify credits added (20 credits)
   - Check Stripe Dashboard for transaction
   - Cancel subscription after testing

2. **Test One-Time Purchase**:
   - Purchase 5 credits pack ($2.49)
   - Verify credits added immediately
   - Check transaction in Stripe Dashboard

3. **Test Webhook Processing**:
   - Monitor logs during purchases
   - Verify webhook events are received
   - Check database updates happen correctly

### 8. Refund Test Transactions

1. Go to Stripe Dashboard > Payments
2. Find your test transactions
3. Issue refunds for test purchases

### 9. Final Verification

- [ ] All environment variables updated in production
- [ ] Webhook endpoint active and receiving events
- [ ] Test transactions successful and refunded
- [ ] No test mode warnings in application
- [ ] Error monitoring configured (if using Sentry)

### 10. Monitor Initial Live Transactions

For the first 24-48 hours after going live:

- Monitor Stripe Dashboard for any failed payments
- Check application logs for webhook errors
- Verify customer credits are being added correctly
- Watch for any customer support issues

## 🚨 Rollback Plan

If issues occur, you can quickly switch back to test mode:

1. Revert environment variables to test keys
2. Redeploy application
3. Investigate and fix issues
4. Retry go-live process

## 📋 Important Notes

- **Keep test keys**: Don't delete test keys, you may need them for development
- **Gradual rollout**: Consider a soft launch with limited users first
- **Customer communication**: Notify users if switching from a beta/test period
- **Compliance**: Ensure you're compliant with local payment regulations
- **Security**: Never commit live keys to version control
- **Backup**: Take a database backup before going live

## 🔒 Security Checklist

- [ ] Live keys only in production environment variables
- [ ] HTTPS enforced on all payment pages
- [ ] Content Security Policy configured
- [ ] Rate limiting enabled on API endpoints
- [ ] Webhook signature verification active
- [ ] PCI compliance maintained (Stripe handles most of this)

## 📞 Support Contacts

- Stripe Support: https://support.stripe.com
- Stripe Status: https://status.stripe.com
- Emergency: Keep Stripe support number handy for critical issues

---

**Last Updated**: 2025-08-17
**Status**: Ready for go-live when business requirements are met
