# Stripe Payment Integration Testing Guide

## Overview

This guide outlines the testing procedures for the newly implemented Stripe payment integration, including subscription plans, pay-as-you-go purchases, and webhook handling.

## Prerequisites

- Stripe test API keys configured in `.env.local`
- Supabase database with the required tables (`users`, `credit_transactions`)
- Stripe webhook endpoint configured in Stripe dashboard

## Test Environment Setup

### 1. Stripe Test Mode Configuration

```bash
# Ensure these environment variables are set for testing
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Stripe Test Products Setup

Create the following test products in your Stripe dashboard:

- Free Plan (price_id: `price_free`)
- Basic Plan - $9.99/month (price_id: `price_basic`)
- Starter Plan - $24.99/month (price_id: `price_starter`)
- Pay-as-you-go packages: 10, 20, 50 credits

### 3. Webhook Configuration

Configure webhook endpoint in Stripe dashboard:

- URL: `https://your-domain.com/api/webhooks/stripe`
- Events to listen for:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`

## Testing Checklist

### Phase 1: Frontend UI Testing

- [ ] **Pricing Page Navigation**
  - [ ] Pricing page loads without errors
  - [ ] Tab switching between subscription and pay-as-you-go works
  - [ ] All plan cards display correctly with proper pricing
  - [ ] Feature comparison section displays correctly

- [ ] **Subscription Plans Component**
  - [ ] All three plans (Free, Basic, Starter) display correctly
  - [ ] Plan features are listed properly
  - [ ] "Subscribe Now" buttons are visible and clickable
  - [ ] Plan selection highlights work correctly

- [ ] **Pay-as-You-Go Component**
  - [ ] All three packages (10, 20, 50 credits) display correctly
  - [ ] Pricing calculations are accurate
  - [ ] "Buy Credits" buttons are visible and clickable
  - [ ] Package selection highlights work correctly

### Phase 2: Authentication Integration

- [ ] **User Authentication**
  - [ ] Unauthenticated users see login prompts when trying to purchase
  - [ ] Authenticated users can access payment flows
  - [ ] User context is properly passed to payment components

### Phase 3: Payment Flow Testing

#### Subscription Testing

- [ ] **Basic Plan Subscription**
  - [ ] Click "Subscribe Now" on Basic Plan
  - [ ] Stripe payment form appears
  - [ ] Enter test card: `4242 4242 4242 4242`
  - [ ] Payment completes successfully
  - [ ] User is redirected back to dashboard
  - [ ] Subscription status shows as "active" in database
  - [ ] User receives 50 credits (Basic Plan allocation)

- [ ] **Starter Plan Subscription**
  - [ ] Repeat above test with Starter Plan
  - [ ] Verify user receives 200 credits
  - [ ] Check subscription details in Stripe dashboard

#### Pay-as-You-Go Testing

- [ ] **10 Credits Purchase**
  - [ ] Click "Buy 10 Credits" on 10-credit package
  - [ ] Stripe payment form appears
  - [ ] Complete payment with test card
  - [ ] Verify credits are added to user account
  - [ ] Check transaction appears in billing history

- [ ] **20 Credits Purchase**
  - [ ] Repeat test with 20-credit package
  - [ ] Verify correct amount is charged
  - [ ] Verify credits are added correctly

- [ ] **50 Credits Purchase**
  - [ ] Repeat test with 50-credit package
  - [ ] Verify best value pricing is applied

### Phase 4: Webhook Testing

- [ ] **Subscription Webhooks**
  - [ ] Monitor webhook logs during subscription creation
  - [ ] Verify `customer.subscription.created` event is received
  - [ ] Check user subscription data is updated in database
  - [ ] Verify credit allocation works correctly

- [ ] **Payment Intent Webhooks**
  - [ ] Monitor webhook logs during pay-as-you-go purchases
  - [ ] Verify `payment_intent.succeeded` event is received
  - [ ] Check credits are added to user account
  - [ ] Verify transaction is recorded in `credit_transactions` table

### Phase 5: Billing Management Testing

- [ ] **Billing History Display**
  - [ ] Navigate to billing management section
  - [ ] Verify all transactions appear in history
  - [ ] Check invoice links work correctly
  - [ ] Verify amounts and dates are displayed correctly

- [ ] **Subscription Management**
  - [ ] View current subscription details
  - [ ] Test "Update Payment Method" functionality
  - [ ] Test "Cancel Subscription" functionality
  - [ ] Verify subscription status updates correctly

### Phase 6: Error Handling Testing

- [ ] **Payment Failures**
  - [ ] Test with declined card: `4000 0000 0000 0002`
  - [ ] Verify error messages are displayed to user
  - [ ] Check that credits are not added for failed payments

- [ ] **Network Errors**
  - [ ] Simulate network interruption during payment
  - [ ] Verify graceful error handling
  - [ ] Check that user can retry payment

- [ ] **Invalid Data**
  - [ ] Test with missing user ID
  - [ ] Test with invalid price IDs
  - [ ] Verify appropriate error responses

## Test Data

### Test Credit Cards

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Insufficient Funds**: `4000 0000 0000 9995`
- **Expired Card**: `4000 0000 0000 0069`

### Test Bank Account (for ACH payments)

- **Success**: `110000000`
- **Decline**: `110000000`

## Monitoring and Logs

### Stripe Dashboard Monitoring

- Monitor payments in Stripe dashboard
- Check webhook delivery status
- Verify customer creation and management

### Application Logs

- Monitor API route logs for errors
- Check webhook processing logs
- Verify database updates

### Database Verification

```sql
-- Check user subscription status
SELECT id, email, subscription_status, credits, stripe_customer_id, stripe_subscription_id
FROM users
WHERE email = 'test@example.com';

-- Check credit transactions
SELECT * FROM credit_transactions
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC;
```

## Success Criteria

### Functional Requirements

- [ ] Users can successfully subscribe to plans
- [ ] Users can purchase pay-as-you-go credits
- [ ] Credits are correctly allocated to user accounts
- [ ] Webhooks properly update user data
- [ ] Billing history displays correctly
- [ ] Subscription management works as expected

### Non-Functional Requirements

- [ ] Payment flows complete within 30 seconds
- [ ] Error messages are clear and actionable
- [ ] UI is responsive and user-friendly
- [ ] No sensitive data is exposed in logs
- [ ] Database transactions are atomic

## Post-Testing Actions

### If Tests Pass

- [ ] Mark testing as complete
- [ ] Document any issues found and resolved
- [ ] Proceed to next development phase
- [ ] Consider production deployment

### If Tests Fail

- [ ] Document specific failures
- [ ] Investigate root causes
- [ ] Implement fixes
- [ ] Re-run affected test cases
- [ ] Only proceed when all tests pass

## Rollback Plan

If critical issues are discovered:

1. Disable payment routes in production
2. Revert to previous working version
3. Implement fixes in development
4. Re-test thoroughly before re-deployment

## Notes

- Always use Stripe test mode for development and testing
- Never use real payment data in test environment
- Monitor Stripe dashboard for any unexpected charges
- Keep test data separate from production data
