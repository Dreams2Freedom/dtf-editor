# Payment Flow Testing Guide

## Prerequisites
- Ensure you're using Stripe TEST mode (not live)
- Have the Stripe dashboard open to monitor events
- Clear browser cache/cookies before testing
- Use Stripe test cards: https://stripe.com/docs/testing

## Test Cards
- **Success**: 4242 4242 4242 4242
- **Requires authentication**: 4000 0025 0000 3155
- **Declined**: 4000 0000 0000 9995
- **Insufficient funds**: 4000 0000 0000 9995

## 1. Subscription Testing

### 1.1 Basic Plan ($9.99/month - 20 credits)
1. Navigate to http://localhost:3000/pricing
2. Click "Subscribe Now" on Basic plan
3. Enter test card: 4242 4242 4242 4242
4. Use any future expiry date and any CVC
5. Complete checkout
6. Verify:
   - Redirected to success page
   - Credits updated to 20
   - Subscription shows as "active" in dashboard
   - Stripe dashboard shows subscription created

### 1.2 Starter Plan ($24.99/month - 60 credits)
1. Repeat above with Starter plan
2. Verify 60 credits added

### 1.3 Customer Portal
1. Go to dashboard
2. Click "Manage Subscription"
3. Verify portal opens
4. Test:
   - Cancel subscription
   - Update payment method
   - Download invoices

## 2. Pay-as-You-Go Testing

### 2.1 10 Credits ($7.99)
1. Navigate to http://localhost:3000/pricing
2. Click "Buy 10 Credits"
3. Enter test card
4. Complete purchase
5. Verify:
   - Credits added immediately
   - Purchase history updated
   - No subscription created

### 2.2 Failed Payment
1. Try purchase with declined card: 4000 0000 0000 9995
2. Verify:
   - Error message shown
   - No credits added
   - No charge in Stripe

## 3. Webhook Testing

### 3.1 Setup Stripe CLI
```bash
# Install Stripe CLI if not already installed
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### 3.2 Test Events
1. Keep webhook forwarding running
2. Complete a subscription
3. Verify webhook logs show:
   - checkout.session.completed
   - customer.subscription.created
   - invoice.payment_succeeded

## 4. Credit System Testing

### 4.1 Credit Deduction
1. Process an image (upscale/background removal)
2. Verify credit decreases by correct amount
3. Check credit_transactions table

### 4.2 Credit Refund
1. Start image processing
2. Force an error (disconnect internet)
3. Verify credits refunded

## 5. End-to-End Journey

### 5.1 New User Flow
1. Sign up new account
2. Verify 2 free credits
3. Use 1 credit for image processing
4. Subscribe to Basic plan
5. Verify total credits = 21 (1 remaining + 20 new)
6. Cancel subscription
7. Verify still have 21 credits

## Issues to Document
- [ ] Any error messages
- [ ] Unexpected behaviors
- [ ] UI/UX improvements needed
- [ ] Performance issues
- [ ] Missing features

## Testing Checklist
- [ ] All subscription plans work
- [ ] All pay-as-you-go packages work
- [ ] Webhooks properly handled
- [ ] Credits correctly added/deducted
- [ ] Customer portal functional
- [ ] Error handling works
- [ ] Success/cancel redirects work