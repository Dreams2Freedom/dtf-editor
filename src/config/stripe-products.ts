// Stripe product configuration
// These IDs must match what's in your Stripe dashboard

export const STRIPE_PRODUCTS = {
  subscriptions: {
    basic: {
      id: 'basic',
      name: 'Basic',
      price: 9.99,
      currency: 'usd',
      interval: 'month' as const,
      features: ['20 credits per month', 'All processing features', 'Priority support', 'HD downloads'],
      creditsPerMonth: 20,
      stripePriceId: process.env.STRIPE_BASIC_PLAN_PRICE_ID || '',
    },
    starter: {
      id: 'starter',
      name: 'Starter',
      price: 24.99,
      currency: 'usd',
      interval: 'month' as const,
      features: ['60 credits per month', 'All processing features', 'Priority support', 'HD downloads', 'Bulk processing (coming soon)'],
      creditsPerMonth: 60,
      stripePriceId: process.env.STRIPE_STARTER_PLAN_PRICE_ID || '',
    },
  },
  payAsYouGo: {
    credits10: {
      id: 'payg-10',
      name: '10 Credits',
      credits: 10,
      price: 7.99,
      currency: 'usd',
      stripePriceId: process.env.STRIPE_PAYG_10_CREDITS_PRICE_ID || '',
    },
    credits20: {
      id: 'payg-20',
      name: '20 Credits',
      credits: 20,
      price: 14.99,
      currency: 'usd',
      stripePriceId: process.env.STRIPE_PAYG_20_CREDITS_PRICE_ID || '',
    },
    credits50: {
      id: 'payg-50',
      name: '50 Credits',
      credits: 50,
      price: 29.99,
      currency: 'usd',
      stripePriceId: process.env.STRIPE_PAYG_50_CREDITS_PRICE_ID || '',
    },
  },
} as const;