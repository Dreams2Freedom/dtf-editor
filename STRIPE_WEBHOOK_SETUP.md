# Stripe Webhook Configuration Guide

## Problem: Webhook Not Receiving Events

Based on the logs, your Stripe payment is successful but the webhook endpoint is not being called. This means Stripe doesn't know where to send the payment events.

## Solution: Configure Webhook in Stripe Dashboard

### Step 1: Add Webhook Endpoint in Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers → Webhooks**
3. Click **"Add endpoint"**
4. Enter the following details:
   - **Endpoint URL**: `https://dtfeditor.com/api/webhooks/stripe`
   - **Description**: DTF Editor Webhook (optional)

### Step 2: Select Events to Listen For

Select the following events (minimum required):
- ✅ `checkout.session.completed` (Critical for both subscriptions and one-time payments)
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`
- ✅ `payment_intent.succeeded`
- ✅ `payment_intent.payment_failed`

### Step 3: Copy the Signing Secret

1. After creating the endpoint, you'll see a **Signing secret**
2. It looks like: `whsec_1234567890abcdef...`
3. Copy this secret

### Step 4: Update Vercel Environment Variable

1. Go to [Vercel Environment Variables](https://vercel.com/s2-transfers/dtf-editor/settings/environment-variables)
2. Find `STRIPE_WEBHOOK_SECRET`
3. Update it with the signing secret you just copied
4. Click "Save"

### Step 5: Redeploy Your Application

1. Go to your Vercel project dashboard
2. Click "Redeploy" on the latest deployment
3. Wait for deployment to complete

## Testing the Webhook

### Option 1: Test with Real Payment
1. Make a small test purchase
2. Check Stripe Dashboard → Developers → Webhooks → Your endpoint
3. You should see successful webhook deliveries

### Option 2: Test with Stripe CLI (Local Development)
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# In another terminal, trigger a test event
stripe trigger checkout.session.completed
```

## Verifying Webhook is Working

After configuration, you can verify by:

1. **In Stripe Dashboard**:
   - Go to Developers → Webhooks → Your endpoint
   - Check "Recent deliveries" - should show successful (200) responses
   - Click on any delivery to see request/response details

2. **In Vercel Logs**:
   - Go to Vercel project → Functions tab
   - Look for logs from `/api/webhooks/stripe`
   - Should see "🔔 STRIPE WEBHOOK RECEIVED" messages

## Troubleshooting

### Common Issues:

1. **Webhook returns 400 error**
   - Wrong signing secret in environment variables
   - Make sure `STRIPE_WEBHOOK_SECRET` matches exactly

2. **Webhook returns 404 error**
   - Wrong endpoint URL
   - Should be exactly: `https://dtfeditor.com/api/webhooks/stripe`

3. **Webhook not triggered at all**
   - Endpoint not added in Stripe Dashboard
   - Events not selected

4. **Webhook succeeds but data not updated**
   - Check Vercel function logs for errors
   - Verify database permissions

## Important Notes

- Webhooks are **required** for subscriptions and payment processing
- Without webhooks, payments succeed but credits/subscriptions won't update
- Each Stripe account needs its own webhook configuration
- Test mode and Live mode have separate webhook endpoints

## Current Status

✅ Payment processing works
❌ Webhook not configured in Stripe Dashboard
✅ Webhook handler code is ready
✅ Environment variables are set (except possibly wrong webhook secret)

## Next Steps

1. Configure webhook endpoint in Stripe Dashboard (follow steps above)
2. Update `STRIPE_WEBHOOK_SECRET` in Vercel with the correct signing secret
3. Redeploy the application
4. Test with a small payment to verify it's working