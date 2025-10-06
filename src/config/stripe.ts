// Stripe Configuration
// These IDs should match your Stripe Dashboard products

export const STRIPE_CONFIG = {
  // Subscription Plans
  subscriptions: {
    basic: {
      name: 'Basic Plan',
      priceId:
        process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID ||
        'price_basic_placeholder',
      productId:
        process.env.NEXT_PUBLIC_STRIPE_BASIC_PRODUCT_ID ||
        'prod_basic_placeholder',
      price: 999, // $9.99 in cents
      credits: 20,
      features: [
        '20 credits per month',
        'All processing tools',
        'Standard support',
        'Credits expire in 30 days',
      ],
    },
    starter: {
      name: 'Starter Plan',
      priceId:
        process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ||
        'price_starter_placeholder',
      productId:
        process.env.NEXT_PUBLIC_STRIPE_STARTER_PRODUCT_ID ||
        'prod_starter_placeholder',
      price: 2499, // $24.99 in cents
      credits: 60,
      features: [
        '60 credits per month',
        'All processing tools',
        'Priority support',
        'Credits expire in 30 days',
        '20% savings vs Basic',
      ],
    },
  },

  // One-time Credit Packages
  creditPackages: {
    small: {
      name: '10 Credits',
      priceId:
        process.env.NEXT_PUBLIC_STRIPE_CREDITS_10_PRICE_ID ||
        'price_credits10_placeholder',
      productId:
        process.env.NEXT_PUBLIC_STRIPE_CREDITS_10_PRODUCT_ID ||
        'prod_credits10_placeholder',
      price: 799, // $7.99 in cents
      credits: 10,
      description: 'Perfect for occasional use',
    },
    medium: {
      name: '20 Credits',
      priceId:
        process.env.NEXT_PUBLIC_STRIPE_CREDITS_20_PRICE_ID ||
        'price_credits20_placeholder',
      productId:
        process.env.NEXT_PUBLIC_STRIPE_CREDITS_20_PRODUCT_ID ||
        'prod_credits20_placeholder',
      price: 1499, // $14.99 in cents
      credits: 20,
      description: 'Most popular package',
    },
    large: {
      name: '50 Credits',
      priceId:
        process.env.NEXT_PUBLIC_STRIPE_CREDITS_50_PRICE_ID ||
        'price_credits50_placeholder',
      productId:
        process.env.NEXT_PUBLIC_STRIPE_CREDITS_50_PRODUCT_ID ||
        'prod_credits50_placeholder',
      price: 2999, // $29.99 in cents
      credits: 50,
      description: 'Best value - save 25%',
    },
  },

  // Webhook endpoints
  webhooks: {
    sessionCompleted: 'checkout.session.completed',
    subscriptionCreated: 'customer.subscription.created',
    subscriptionUpdated: 'customer.subscription.updated',
    subscriptionDeleted: 'customer.subscription.deleted',
    invoicePaymentSucceeded: 'invoice.payment_succeeded',
    invoicePaymentFailed: 'invoice.payment_failed',
  },
};

// Helper functions
export function getSubscriptionPlan(priceId: string) {
  return Object.values(STRIPE_CONFIG.subscriptions).find(
    plan => plan.priceId === priceId
  );
}

export function getCreditPackage(priceId: string) {
  return Object.values(STRIPE_CONFIG.creditPackages).find(
    pkg => pkg.priceId === priceId
  );
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}
