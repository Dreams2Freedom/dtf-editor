import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    // Use live keys in production, test keys in development
    const stripeSecretKey =
      process.env.NODE_ENV === 'production'
        ? process.env.STRIPE_LIVE_SECRET_KEY
        : process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      throw new Error('Stripe secret key is not configured');
    }
    stripeInstance = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia' as any,
    });
  }
  return stripeInstance;
}
