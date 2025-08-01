# Stripe Setup Guide for DTF Editor

This guide will help you set up the required Stripe products and prices for DTF Editor.

## Prerequisites

1. A Stripe account (test mode is fine for development)
2. Access to Stripe Dashboard
3. Your Stripe API keys

## Step 1: Create Subscription Products

Go to Stripe Dashboard > Products and create the following:

### Basic Plan
1. Click "Add product"
2. Name: "DTF Editor Basic Plan"
3. Description: "20 credits per month for image processing"
4. Add pricing:
   - Price: $9.99
   - Billing period: Monthly
   - Usage type: Licensed
5. Save the product
6. Copy the Product ID (starts with `prod_`) and Price ID (starts with `price_`)

### Starter Plan
1. Click "Add product"
2. Name: "DTF Editor Starter Plan"
3. Description: "60 credits per month for image processing - Best value!"
4. Add pricing:
   - Price: $24.99
   - Billing period: Monthly
   - Usage type: Licensed
5. Save the product
6. Copy the Product ID and Price ID

## Step 2: Create One-Time Credit Packages

### 10 Credits Package
1. Click "Add product"
2. Name: "10 DTF Processing Credits"
3. Description: "10 credits for image processing - Perfect for occasional use"
4. Add pricing:
   - Price: $7.99
   - Payment type: One time
5. Save and copy IDs

### 20 Credits Package
1. Click "Add product"
2. Name: "20 DTF Processing Credits"
3. Description: "20 credits for image processing - Most popular"
4. Add pricing:
   - Price: $14.99
   - Payment type: One time
5. Save and copy IDs

### 50 Credits Package
1. Click "Add product"
2. Name: "50 DTF Processing Credits"
3. Description: "50 credits for image processing - Best value, save 25%"
4. Add pricing:
   - Price: $29.99
   - Payment type: One time
5. Save and copy IDs

## Step 3: Set Up Webhooks

1. Go to Stripe Dashboard > Developers > Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Save and copy the Webhook signing secret

## Step 4: Update Environment Variables

Add the following to your `.env.local` file:

```bash
# Stripe API Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Subscription Products
NEXT_PUBLIC_STRIPE_BASIC_PRODUCT_ID=prod_xxxxx
NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID=price_xxxxx
NEXT_PUBLIC_STRIPE_STARTER_PRODUCT_ID=prod_xxxxx
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_xxxxx

# Credit Packages
NEXT_PUBLIC_STRIPE_CREDITS_10_PRODUCT_ID=prod_xxxxx
NEXT_PUBLIC_STRIPE_CREDITS_10_PRICE_ID=price_xxxxx
NEXT_PUBLIC_STRIPE_CREDITS_20_PRODUCT_ID=prod_xxxxx
NEXT_PUBLIC_STRIPE_CREDITS_20_PRICE_ID=price_xxxxx
NEXT_PUBLIC_STRIPE_CREDITS_50_PRODUCT_ID=prod_xxxxx
NEXT_PUBLIC_STRIPE_CREDITS_50_PRICE_ID=price_xxxxx
```

## Step 5: Test Your Setup

1. Run the application in development mode
2. Go to `/pricing` page
3. Try purchasing a subscription or credit package
4. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 9995`

## Stripe Dashboard Links

- Products: https://dashboard.stripe.com/test/products
- Webhooks: https://dashboard.stripe.com/test/webhooks
- API Keys: https://dashboard.stripe.com/test/apikeys

## Important Notes

1. **Test Mode**: Always use test mode for development
2. **Metadata**: Consider adding metadata to products for easier tracking
3. **Descriptions**: Clear descriptions help with customer support
4. **Webhook Security**: Always verify webhook signatures in production
5. **Error Handling**: Implement proper error handling for failed payments

## Troubleshooting

### Webhook Failures
- Check endpoint URL is correct
- Verify webhook secret matches
- Check server logs for errors
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### Payment Failures
- Check API keys are correct
- Verify products exist in Stripe
- Check browser console for errors
- Ensure CORS is configured correctly

### Credit Not Applied
- Check webhook is firing
- Verify database connection
- Check transaction logs
- Ensure user session is valid