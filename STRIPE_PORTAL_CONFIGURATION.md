# Stripe Customer Portal Configuration Guide

## Disable Direct Cancellation in Stripe Portal

To ensure users go through our retention flow, you need to configure the Stripe Customer Portal settings:

### Steps to Configure:

1. **Go to Stripe Dashboard**
   - Navigate to: https://dashboard.stripe.com/test/settings/billing/portal

2. **Edit Portal Settings**
   - Click "Edit" on your portal configuration

3. **Subscription Cancellation Settings**
   - Find the "Cancellation" section
   - **Change from:** "Cancel immediately"
   - **Change to:** "Redirect to your cancellation flow"
   - **Set Cancellation URL to:** `https://yourdomain.com/api/stripe/cancel-subscription`
   - Or in development: `http://localhost:3000/api/stripe/cancel-subscription`

4. **Alternative Option - Disable Cancellation Completely**
   - You can also choose "Customers cannot cancel subscriptions"
   - This forces them to use the cancellation button in your app

5. **Recommended Settings:**
   - ✅ Allow customers to view invoices
   - ✅ Allow customers to update payment methods
   - ✅ Allow customers to update billing address
   - ❌ Disable direct plan switching (use your PlanSwitcher component)
   - ❌ Disable direct cancellation (use retention flow)

6. **Save Configuration**
   - Click "Save" to apply changes

### Testing the Configuration:

1. Access customer portal again
2. Verify "Cancel subscription" either:
   - Redirects to your retention page
   - Or is completely disabled
3. Users must now use the "Cancel Subscription" button in your dashboard

### In Your Dashboard:

Add a custom cancellation button that triggers the retention flow:

```tsx
// In dashboard or subscription management component
<Button
  onClick={handleCancelSubscription}
  variant="outline"
  className="text-red-600"
>
  Cancel Subscription
</Button>

const handleCancelSubscription = async () => {
  // Redirect to retention page
  router.push('/subscription/cancel');
};
```

### Benefits:

1. **100% retention flow coverage** - No bypassing offers
2. **Better tracking** - Know exactly who attempts to cancel
3. **Higher retention** - Users see pause/discount offers
4. **Consistent UX** - All cancellations go through same flow

### Current Status:

- ❌ Portal allows direct cancellation (bypasses retention)
- 🔧 Need to configure portal settings in Stripe Dashboard
- ✅ Retention system built and ready (just not being triggered)