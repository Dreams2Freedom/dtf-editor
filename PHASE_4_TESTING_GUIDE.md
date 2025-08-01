# Phase 4 Testing Guide - Payment System

## Current Test Account
- Email: Shannonherod@gmail.com
- Credits: 10 (test credits)
- Status: Free plan

## 1. Subscription Purchase Test

### Steps to Test:
1. Go to **Pricing** page from the dashboard or navigate to `/pricing`
2. You should see two tabs: "Subscription Plans" and "Pay As You Go"
3. In Subscription Plans, you'll see:
   - **Free Plan** (2 credits/month) - Current plan
   - **Basic Plan** ($9.99/month - 20 credits)
   - **Starter Plan** ($19.99/month - 60 credits)

### Test Basic Plan Subscription:
1. Click "Subscribe" on the Basic Plan
2. You'll be redirected to Stripe Checkout
3. Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/34)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any valid ZIP (e.g., 10001)
4. Complete the checkout
5. You should be redirected back to dashboard
6. Verify:
   - Dashboard shows "Basic Plan" as current plan
   - Credits updated to 20 (or 30 if keeping existing 10)
   - Subscription details show in dashboard

## 2. Pay-As-You-Go Credit Packages

### Steps to Test:
1. Click "Pay As You Go" tab on pricing page
2. You'll see three packages:
   - 10 Credits - $4.99
   - 20 Credits - $8.99
   - 50 Credits - $19.99

### Test 10 Credit Package:
1. Click "Buy Now" on 10 credit package
2. Complete Stripe Checkout with test card
3. Verify credits added to account

## 3. Subscription Management

### Access Customer Portal:
1. In dashboard, look for "Manage Subscription" button
2. Click to access Stripe Customer Portal
3. In the portal you can:
   - View payment history
   - Update payment method
   - Cancel subscription
   - Switch plans

### Test Cancellation with Retention:
1. Click "Cancel subscription" in portal
2. You should be redirected to retention page
3. You'll see offers:
   - Pause subscription (2 weeks, 1 month, 2 months)
   - 50% off next billing cycle
4. Test accepting an offer or proceeding with cancellation

## 4. Things to Watch For

### Success Indicators:
- ✅ Stripe Checkout loads properly
- ✅ Payment processes with test card
- ✅ Credits allocated correctly after purchase
- ✅ Subscription status updates in dashboard
- ✅ Customer portal accessible
- ✅ Webhook updates profile correctly

### Common Issues:
- ❌ "No such price" error - Price IDs misconfigured
- ❌ Credits not updating - Webhook not processing
- ❌ Portal not loading - Portal not configured in Stripe
- ❌ Retention not showing - Check cancellation URL handling

## 5. Webhook Testing

If credits don't update after payment:
1. Check Stripe Dashboard > Webhooks for event status
2. Look for `checkout.session.completed` events
3. Verify webhook endpoint is receiving events

## Test Card Numbers

### Successful Payment:
- `4242 4242 4242 4242` - Visa
- `5555 5555 5555 4444` - Mastercard

### Decline Scenarios:
- `4000 0000 0000 0002` - Card declined
- `4000 0000 0000 9995` - Insufficient funds

## Notes
- All prices are in test mode
- No real charges will occur
- Test subscriptions auto-renew unless cancelled
- Credits expire based on plan (30-90 days)