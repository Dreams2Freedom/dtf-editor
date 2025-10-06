# Stripe Environment Variables Setup Guide

## Required Stripe Environment Variables

To enable payment functionality, you need to add the following environment variables to your Vercel deployment:

### 1. Core Stripe Keys

| Variable Name                        | Description                     | Where to Find                                            | Example Format                       |
| ------------------------------------ | ------------------------------- | -------------------------------------------------------- | ------------------------------------ |
| `STRIPE_SECRET_KEY`                  | Your Stripe secret API key      | Stripe Dashboard → Developers → API keys                 | `sk_live_51H...` or `sk_test_51H...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Your public Stripe key          | Stripe Dashboard → Developers → API keys                 | `pk_live_51H...` or `pk_test_51H...` |
| `STRIPE_WEBHOOK_SECRET`              | Webhook endpoint signing secret | Stripe Dashboard → Developers → Webhooks → Your endpoint | `whsec_...`                          |

### 2. Price IDs (Already Configured)

You already have these configured correctly:

- `STRIPE_BASIC_PLAN_PRICE_ID`
- `STRIPE_STARTER_PLAN_PRICE_ID`
- `STRIPE_PAYG_10_CREDITS_PRICE_ID`
- `STRIPE_PAYG_20_CREDITS_PRICE_ID`
- `STRIPE_PAYG_50_CREDITS_PRICE_ID`

## Setup Instructions

### Step 1: Get Your Stripe API Keys

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers → API keys**
3. You'll see two keys:
   - **Publishable key**: Can be safely used in frontend code
   - **Secret key**: Must be kept secure, server-side only

### Step 2: Get Your Webhook Secret

1. In Stripe Dashboard, go to **Developers → Webhooks**
2. Find your webhook endpoint (should be `https://dtfeditor.com/api/webhooks/stripe`)
3. Click on the endpoint
4. Copy the **Signing secret** (starts with `whsec_`)

### Step 3: Add to Vercel

1. Go to your [Vercel project](https://vercel.com/s2-transfers/dtf-editor/settings/environment-variables)
2. Click "Add New" for each variable
3. Add all three variables:
   - Name: `STRIPE_SECRET_KEY`
   - Name: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Name: `STRIPE_WEBHOOK_SECRET`
4. Make sure to select "Production" environment (and others if needed)
5. Click "Save"

### Step 4: Redeploy

After adding all environment variables:

1. Go to your Vercel project dashboard
2. Click on "Redeploy" on the latest deployment
3. Wait for deployment to complete

## Testing

To verify everything is working:

1. Try to purchase credits or subscribe to a plan
2. Check that the Stripe checkout page loads properly
3. Complete a test transaction (use Stripe test cards if in test mode)

## Test Mode vs Live Mode

- **Test Mode**: Use keys starting with `sk_test_` and `pk_test_`
- **Live Mode**: Use keys starting with `sk_live_` and `pk_live_`

Make sure your keys match (both test or both live) and that your Stripe account is in the correct mode.

## Common Issues

1. **"STRIPE_SECRET_KEY is required"**: The secret key is missing from environment variables
2. **Checkout page doesn't load**: Publishable key is missing or incorrect
3. **Webhooks fail**: Webhook secret is missing or doesn't match the endpoint

## Security Best Practices

- ✅ Never commit API keys to your repository
- ✅ Only use `NEXT_PUBLIC_` prefix for the publishable key
- ✅ Keep the secret key and webhook secret private
- ✅ Use different keys for development and production
- ✅ Rotate keys periodically for security
