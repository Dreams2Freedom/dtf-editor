# Webhook Debugging Guide

## Quick Checks When Webhooks Aren't Working

### 1. Check Stripe Dashboard Webhook Logs

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click on your webhook endpoint: `https://dtfeditor.com/api/webhooks/stripe`
3. Look at "Recent deliveries" section
4. Check for:
   - ✅ 200 OK responses = Webhook received and processed
   - ❌ 401 Unauthorized = Wrong webhook secret
   - ❌ 400 Bad Request = Signature verification failed
   - ❌ 500 Error = Code error in webhook handler

### 2. Check Vercel Function Logs

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Go to "Functions" tab
4. Find `/api/webhooks/stripe`
5. Check recent invocations and logs

### 3. Common Issues and Solutions

#### Issue: Webhook returns 401 Unauthorized
**Solution**: Update `STRIPE_WEBHOOK_SECRET` in Vercel with the signing secret from Stripe

#### Issue: Webhook returns 200 but data not updated
**Possible Causes**:
- userId not in metadata
- Customer ID not linked to user profile
- Database permission issues

**Check**: Look at the webhook response body in Stripe dashboard for error messages

#### Issue: Webhook not triggered at all
**Solution**: Ensure events are selected in Stripe webhook configuration

### 4. Testing Webhook Manually

Use this curl command to test if your webhook endpoint is accessible:

```bash
curl -X POST https://dtfeditor.com/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

Should return: `{"error":"Missing stripe-signature header"}`

### 5. Required Webhook Events

Make sure these events are enabled in Stripe:
- `checkout.session.completed` ✅
- `customer.subscription.created` ✅
- `customer.subscription.updated` ✅
- `customer.subscription.deleted` ✅
- `payment_intent.succeeded` ✅

### 6. Debugging Checklist

When a payment/subscription doesn't update:

1. **In Stripe Dashboard**:
   - [ ] Check payment was successful
   - [ ] Check webhook was sent
   - [ ] Check webhook response (200 OK?)
   - [ ] Check response body for errors

2. **In Vercel Logs**:
   - [ ] Check if webhook function was invoked
   - [ ] Look for error messages
   - [ ] Check if userId was found

3. **In Database**:
   - [ ] Check if user has stripe_customer_id
   - [ ] Check profiles table for user
   - [ ] Check credit_transactions for records

### 7. Manual Scripts Available

If webhooks fail, use these scripts as temporary fixes:

```bash
# Fix subscription to Basic plan
node scripts/resubscribe-user.js <email>

# Cancel subscription
node scripts/cancel-subscription-manual.js <email>

# Update credits
node scripts/update-user-credits.js <email> <credits>

# Check users
node scripts/check-users.js check
```

### 8. Next Steps for Permanent Fix

The webhook handler has been updated to:
1. Look up userId by customer ID when metadata is missing
2. Add detailed logging for debugging
3. Handle all subscription states properly

Once deployed, future subscriptions should work automatically.