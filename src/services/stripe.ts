import { env } from '@/config/env';
import Stripe from 'stripe';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  creditsPerMonth?: number;
  stripePriceId: string;
}

export interface PayAsYouGoPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  stripePriceId: string;
}

export interface CreateSubscriptionParams {
  customerId: string;
  priceId: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentParams {
  customerId: string;
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
}

export interface BillingHistoryItem {
  id: string;
  date: Date;
  amount: number;
  currency: string;
  status: string;
  type: 'subscription' | 'payment_intent';
  description: string;
  invoiceUrl?: string;
}

export class StripeService {
  private stripe: Stripe | null = null;

  constructor() {
    // Lazy initialization - don't create Stripe client until needed
  }

  private getStripeClient(): Stripe {
    if (!this.stripe) {
      if (!env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY is required');
      }
      this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-06-30.basil',
      });
    }
    return this.stripe;
  }

  // Subscription Plans
  public getSubscriptionPlans(): SubscriptionPlan[] {
    return [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        currency: 'usd',
        interval: 'month',
        features: ['2 credits per month', 'All basic features', 'Email support'],
        creditsPerMonth: 2,
        stripePriceId: '', // Free plan doesn't need a Stripe price ID
      },
      {
        id: 'basic',
        name: 'Basic',
        price: 9.99,
        currency: 'usd',
        interval: 'month',
        features: ['20 credits per month', 'All features', 'Priority support', 'HD downloads'],
        creditsPerMonth: 20,
        stripePriceId: env.STRIPE_BASIC_PLAN_PRICE_ID || '',
      },
      {
        id: 'starter',
        name: 'Starter',
        price: 24.99,
        currency: 'usd',
        interval: 'month',
        features: ['60 credits per month', 'All features', 'Priority support', 'HD downloads', 'Bulk processing'],
        creditsPerMonth: 60,
        stripePriceId: env.STRIPE_STARTER_PLAN_PRICE_ID || '',
      },
    ];
  }

  // Pay-as-You-Go Packages
  public getPayAsYouGoPackages(): PayAsYouGoPackage[] {
    return [
      {
        id: 'payg-10',
        name: '10 Credits',
        credits: 10,
        price: 7.99,
        currency: 'usd',
        stripePriceId: env.STRIPE_PAYG_10_CREDITS_PRICE_ID || '',
      },
      {
        id: 'payg-20',
        name: '20 Credits',
        credits: 20,
        price: 14.99,
        currency: 'usd',
        stripePriceId: env.STRIPE_PAYG_20_CREDITS_PRICE_ID || '',
      },
      {
        id: 'payg-50',
        name: '50 Credits',
        credits: 50,
        price: 29.99,
        currency: 'usd',
        stripePriceId: env.STRIPE_PAYG_50_CREDITS_PRICE_ID || '',
      },
    ];
  }

  // Customer Management
  public async createCustomer(email: string, name?: string): Promise<Stripe.Customer> {
    return this.getStripeClient().customers.create({
      email,
      name,
      metadata: {
        source: 'dtf-editor',
      },
    });
  }

  public async getCustomer(customerId: string): Promise<Stripe.Customer | null> {
    try {
      return await this.getStripeClient().customers.retrieve(customerId) as Stripe.Customer;
    } catch (error) {
      return null;
    }
  }

  public async updateCustomer(customerId: string, data: Partial<Stripe.CustomerUpdateParams>): Promise<Stripe.Customer> {
    return this.getStripeClient().customers.update(customerId, data);
  }

  // Subscription Management
  public async createSubscription(params: CreateSubscriptionParams): Promise<Stripe.Subscription> {
    return this.getStripeClient().subscriptions.create({
      customer: params.customerId,
      items: [{ price: params.priceId }],
      metadata: params.metadata,
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });
  }

  public async getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
    try {
      return await this.getStripeClient().subscriptions.retrieve(subscriptionId);
    } catch (error) {
      return null;
    }
  }

  public async updateSubscription(subscriptionId: string, params: Stripe.SubscriptionUpdateParams): Promise<Stripe.Subscription> {
    return this.getStripeClient().subscriptions.update(subscriptionId, params);
  }

  public async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<Stripe.Subscription> {
    return this.getStripeClient().subscriptions.update(subscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd,
    });
  }

  public async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.getStripeClient().subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }

  // Pay-as-You-Go Purchases
  public async createPaymentIntent(params: CreatePaymentIntentParams): Promise<Stripe.PaymentIntent> {
    return this.getStripeClient().paymentIntents.create({
      amount: params.amount,
      currency: params.currency,
      customer: params.customerId,
      metadata: params.metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });
  }

  public async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent | null> {
    try {
      return await this.getStripeClient().paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      return null;
    }
  }

  // Payment Methods
  public async getPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    const paymentMethods = await this.getStripeClient().paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    return paymentMethods.data;
  }

  public async attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<Stripe.PaymentMethod> {
    return this.getStripeClient().paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
  }

  public async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    return this.getStripeClient().paymentMethods.detach(paymentMethodId);
  }

  public async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<Stripe.Customer> {
    return this.getStripeClient().customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  }

  // Billing History
  public async getBillingHistory(customerId: string, limit: number = 50): Promise<BillingHistoryItem[]> {
    const [invoices, paymentIntents] = await Promise.all([
      this.getStripeClient().invoices.list({
        customer: customerId,
        limit,
        status: 'paid',
      }),
      this.getStripeClient().paymentIntents.list({
        customer: customerId,
        limit,
      }),
    ]);

    const history: BillingHistoryItem[] = [];

    // Add subscription invoices
    for (const invoice of invoices.data) {
      if ((invoice as any).subscription) {
        history.push({
          id: invoice.id || 'unknown',
          date: new Date(invoice.created * 1000),
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: invoice.status ?? 'unknown',
          type: 'subscription',
          description: `Subscription payment - ${invoice.lines?.data[0]?.description || 'Monthly subscription'}`,
          invoiceUrl: invoice.hosted_invoice_url || undefined,
        });
      }
    }

    // Add pay-as-you-go payments
    for (const paymentIntent of paymentIntents.data) {
      if (paymentIntent.status === 'succeeded' && !(paymentIntent as any).invoice) {
        history.push({
          id: paymentIntent.id,
          date: new Date(paymentIntent.created * 1000),
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          type: 'payment_intent',
          description: paymentIntent.metadata.description || 'Pay-as-you-go purchase' || '',
        });
      }
    }

    // Sort by date (newest first)
    return history.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  // Checkout Sessions
  public async createCheckoutSession(params: any): Promise<Stripe.Checkout.Session> {
    return this.getStripeClient().checkout.sessions.create(params);
  }

  public async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session | null> {
    try {
      return await this.getStripeClient().checkout.sessions.retrieve(sessionId);
    } catch (error) {
      return null;
    }
  }

  // Customer Portal
  public async createPortalSession(customerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session> {
    return this.getStripeClient().billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  // Price Management
  public async getPrice(priceId: string): Promise<Stripe.Price | null> {
    try {
      return await this.getStripeClient().prices.retrieve(priceId);
    } catch (error) {
      return null;
    }
  }

  // Webhook Handling
  public constructWebhookEvent(payload: string, signature: string): Stripe.Event {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required for webhook verification');
    }

    return this.getStripeClient().webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  }

  // Utility Methods
  public formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  }

  public getStripePublishableKey(): string {
    return env.STRIPE_PUBLISHABLE_KEY;
  }
}

// Only create the service instance on the server side
let stripeService: StripeService | null = null;

export function getStripeService(): StripeService {
  if (typeof window === 'undefined') {
    // Server-side: create the service
    if (!stripeService) {
      stripeService = new StripeService();
    }
    return stripeService;
  } else {
    // Client-side: throw error for methods that require server-side access
    throw new Error('StripeService methods that require STRIPE_SECRET_KEY must be called from server-side code');
  }
}

// Export a client-safe version for read-only operations
export const stripeClient = {
  getStripePublishableKey: () => {
    return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  },

  formatAmount: (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  },
}; 