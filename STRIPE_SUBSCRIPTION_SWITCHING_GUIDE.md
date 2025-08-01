# Stripe Subscription Plan Switching Guide (2025)

This guide provides comprehensive information and code examples for implementing subscription plan switching with proration in Stripe using Next.js/Node.js.

## Table of Contents
1. [How Proration Works](#how-proration-works)
2. [Proration Behavior Options](#proration-behavior-options)
3. [Implementation Examples](#implementation-examples)
4. [Credit Adjustments & Refunds](#credit-adjustments--refunds)
5. [Best Practices](#best-practices)

## How Proration Works

By default, Stripe prorates subscription changes. Here's how it works:

### Example Calculation
- Customer signs up on May 1 for a $100/month plan → Billed $100 immediately
- Customer upgrades to $200/month plan on May 15
- On June 1, customer is billed $250:
  - $200 for the renewal
  - $50 prorating adjustment (half month of the $100 difference)

### When Billing Dates Change
Billing dates remain the same when switching between plans with the same interval (e.g., monthly to monthly). However, billing dates change when:
- Switching intervals (monthly to yearly)
- Moving from free to paid
- Trial starts or ends

## Proration Behavior Options

### 1. `create_prorations` (Default)
- Creates proration items but doesn't invoice immediately
- Prorations are included in the next regular invoice
- Negative prorations create credits, positive prorations create charges

### 2. `always_invoice`
- Creates prorations AND immediately generates an invoice
- Customer is charged/credited right away
- Use this for immediate billing adjustments

### 3. `none`
- No proration adjustments
- Customer continues current billing, new price applies at next renewal
- No credits for unused time when switching intervals

## Implementation Examples

### Basic Subscription Update

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function updateSubscriptionPlan(subscriptionId, newPriceId, prorationBehavior = 'create_prorations') {
  try {
    // Retrieve current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    if (!subscription.items.data || subscription.items.data.length === 0) {
      throw new Error('No subscription items found');
    }
    
    // Update subscription with new price
    const updatedSubscription = await stripe.subscriptions.update(
      subscriptionId,
      {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId
        }],
        proration_behavior: prorationBehavior
      }
    );
    
    return updatedSubscription;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}
```

### Next.js API Route Example

```typescript
// app/api/subscriptions/switch-plan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
});

export async function POST(request: NextRequest) {
  try {
    const { subscriptionId, newPriceId, billingBehavior } = await request.json();
    
    // Validate user has permission to update this subscription
    // ... authentication logic here ...
    
    // Determine proration behavior based on business logic
    let prorationBehavior: Stripe.SubscriptionUpdateParams.ProrationBehavior;
    
    switch (billingBehavior) {
      case 'immediate':
        prorationBehavior = 'always_invoice';
        break;
      case 'no_proration':
        prorationBehavior = 'none';
        break;
      default:
        prorationBehavior = 'create_prorations';
    }
    
    // Update the subscription
    const subscription = await stripe.subscriptions.update(
      subscriptionId,
      {
        items: [{
          id: (await stripe.subscriptions.retrieve(subscriptionId)).items.data[0].id,
          price: newPriceId
        }],
        proration_behavior: prorationBehavior
      }
    );
    
    return NextResponse.json({ subscription });
  } catch (error) {
    console.error('Subscription update error:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}
```

### Preview Proration Before Applying

```javascript
async function previewSubscriptionChange(subscriptionId, newPriceId) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionItemId = subscription.items.data[0].id;
    
    // Create a preview of the upcoming invoice
    const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
      subscription: subscriptionId,
      subscription_items: [{
        id: subscriptionItemId,
        price: newPriceId
      }],
      subscription_proration_behavior: 'create_prorations'
    });
    
    // Calculate proration amount
    const prorationAmount = upcomingInvoice.lines.data
      .filter(line => line.proration)
      .reduce((total, line) => total + line.amount, 0);
    
    return {
      totalAmount: upcomingInvoice.amount_due,
      prorationAmount: prorationAmount,
      currency: upcomingInvoice.currency,
      nextBillingDate: new Date(upcomingInvoice.period_end * 1000)
    };
  } catch (error) {
    console.error('Error previewing subscription change:', error);
    throw error;
  }
}
```

### Handle Downgrades with Credit Balance

```javascript
async function downgradeSubscription(subscriptionId, newPriceId, refundCredit = false) {
  try {
    // Update subscription (creates credit)
    const subscription = await stripe.subscriptions.update(
      subscriptionId,
      {
        items: [{
          id: (await stripe.subscriptions.retrieve(subscriptionId)).items.data[0].id,
          price: newPriceId
        }],
        proration_behavior: 'create_prorations'
      }
    );
    
    // Check if customer has credit balance
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    
    if (refundCredit && customer.balance < 0) {
      // Customer has credit (negative balance)
      const creditAmount = Math.abs(customer.balance);
      
      // Create a refund for the credit amount
      const refund = await stripe.refunds.create({
        customer: customer.id,
        amount: creditAmount,
        reason: 'requested_by_customer',
        metadata: {
          reason: 'subscription_downgrade_credit'
        }
      });
      
      // Reset customer balance to zero
      await stripe.customers.update(customer.id, {
        balance: 0
      });
      
      return { subscription, refund };
    }
    
    return { subscription };
  } catch (error) {
    console.error('Error downgrading subscription:', error);
    throw error;
  }
}
```

### Scheduled Plan Changes

```javascript
async function scheduleSubscriptionChange(subscriptionId, newPriceId, effectiveDate) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Create or update subscription schedule
    const schedule = await stripe.subscriptionSchedules.create({
      from_subscription: subscriptionId
    });
    
    // Update the schedule to change the plan at a specific date
    const updatedSchedule = await stripe.subscriptionSchedules.update(
      schedule.id,
      {
        phases: [
          {
            start_date: subscription.current_period_start,
            end_date: effectiveDate,
            items: [{
              price: subscription.items.data[0].price.id,
              quantity: subscription.items.data[0].quantity
            }]
          },
          {
            start_date: effectiveDate,
            items: [{
              price: newPriceId
            }],
            proration_behavior: 'create_prorations'
          }
        ]
      }
    );
    
    return updatedSchedule;
  } catch (error) {
    console.error('Error scheduling subscription change:', error);
    throw error;
  }
}
```

## Credit Adjustments & Refunds

### Key Points:
1. **Downgrades create credits** - Applied to future invoices by default
2. **Credits aren't automatically refunded** - Must be handled manually
3. **Flexible billing mode** (2025) - Provides more accurate credit calculations

### Manual Credit Refund Process:
```javascript
async function refundCustomerCredit(customerId) {
  const customer = await stripe.customers.retrieve(customerId);
  
  if (customer.balance < 0) { // Negative balance = credit
    const creditAmount = Math.abs(customer.balance);
    
    // Create refund
    await stripe.refunds.create({
      customer: customerId,
      amount: creditAmount,
      reason: 'requested_by_customer'
    });
    
    // Reset balance
    await stripe.customers.update(customerId, { balance: 0 });
  }
}
```

## Best Practices

### 1. **Always Preview Changes**
Show customers exactly what they'll be charged before confirming:
```javascript
const preview = await previewSubscriptionChange(subscriptionId, newPriceId);
// Display preview.prorationAmount to customer
```

### 2. **Handle Unpaid Invoices**
Disable proration if the latest invoice is unpaid:
```javascript
const subscription = await stripe.subscriptions.retrieve(subscriptionId);
const latestInvoice = await stripe.invoices.retrieve(subscription.latest_invoice);

const prorationBehavior = latestInvoice.status === 'open' ? 'none' : 'create_prorations';
```

### 3. **Use Subscription Schedules for Complex Changes**
For multi-step changes or future-dated updates, use Subscription Schedules API.

### 4. **Store Important IDs**
Keep these in your database:
- Subscription ID
- Subscription Item IDs
- Price IDs
- Schedule IDs (if using schedules)

### 5. **Consider Flexible Billing Mode**
For 2025, consider using `billing_mode: 'flexible'` for:
- More predictable billing
- Better credit calculations
- Mixed intervals support

### 6. **Webhook Handling**
Listen for these events:
- `customer.subscription.updated`
- `invoice.created`
- `invoice.payment_succeeded`
- `customer.subscription.deleted`

### 7. **Error Handling**
Always implement proper error handling:
```javascript
try {
  await updateSubscriptionPlan(subId, priceId);
} catch (error) {
  if (error.type === 'StripeInvalidRequestError') {
    // Handle invalid parameters
  } else if (error.type === 'StripeAPIError') {
    // Handle API errors
  }
  // Log error and notify customer
}
```

### 8. **Testing**
Use Stripe test mode and test clocks to verify:
- Proration calculations
- Billing date changes
- Credit applications
- Refund processes

## Environment Variables

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## Additional Resources
- [Stripe Prorations Documentation](https://docs.stripe.com/billing/subscriptions/prorations)
- [Subscription Schedules](https://docs.stripe.com/billing/subscriptions/subscription-schedules)
- [Flexible Billing Mode](https://docs.stripe.com/billing/subscriptions/billing-mode)
- [API Reference - Update Subscription](https://docs.stripe.com/api/subscriptions/update)