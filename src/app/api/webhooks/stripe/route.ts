import { NextRequest, NextResponse } from 'next/server';
import { StripeService } from '@/services/stripe';
import { emailService } from '@/services/email';

const stripeService = new StripeService();
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request: NextRequest) {
  console.log('\n🔔 STRIPE WEBHOOK RECEIVED');
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.log('❌ Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  try {
    const event = stripeService.constructWebhookEvent(body, signature);
    console.log('📨 Event type:', event.type);
    console.log('📨 Event ID:', event.id);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionEvent(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCancellation(event.data.object);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;

      default:
        // Unhandled event type
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }
}

async function handleSubscriptionEvent(subscription: any) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  // Get the price ID from the subscription
  const priceId = subscription.items?.data?.[0]?.price?.id;
  
  // Determine the plan based on the price ID
  const plans = stripeService.getSubscriptionPlans();
  const plan = plans.find((p: any) => p.stripePriceId === priceId);
  
  const updateData: any = {
    stripe_subscription_id: subscription.id,
    subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  };

  // If we found a matching plan, update both status and plan
  if (plan) {
    updateData.subscription_status = plan.id; // 'basic', 'starter', etc.
    updateData.subscription_plan = plan.id;
  }

  // Handle cancelled subscriptions
  if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
    updateData.subscription_status = 'cancelled';
  }

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId);

  if (error) {
    throw error;
  }
}

async function handleSubscriptionCancellation(subscription: any) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'canceled',
      subscription_canceled_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    throw error;
  }
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  const userId = invoice.metadata?.userId;
  if (!userId) return;

  // Handle subscription renewal
  if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
    // Update subscription billing period dates
    const subscription = await stripeService.getSubscription(invoice.subscription);
    if (subscription) {
      // Update the billing period in profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          stripe_current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          stripe_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating billing period:', updateError);
      }

      // Trigger credit reset for the new billing period
      try {
        const response = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/credits/reset`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.SUPABASE_SERVICE_ROLE_KEY
          },
          body: JSON.stringify({ userId })
        });

        if (!response.ok) {
          console.error('Failed to reset credits:', await response.text());
        }
      } catch (error) {
        console.error('Error calling credit reset:', error);
      }
    }
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: any) {
  console.log('🎯 handlePaymentIntentSucceeded called');
  console.log('Payment Intent ID:', paymentIntent.id);
  console.log('Metadata:', paymentIntent.metadata);
  
  const userId = paymentIntent.metadata?.userId;
  const credits = parseInt(paymentIntent.metadata?.credits || '0');
  
  console.log('User ID:', userId);
  console.log('Credits to add:', credits);
  
  if (!userId || !credits) {
    console.log('⚠️ Missing userId or credits, skipping');
    return;
  }

  try {
    // Use the credit addition function for pay-as-you-go purchases
    console.log('📝 Calling add_user_credits RPC...');
    const { error } = await supabase.rpc('add_user_credits', {
      p_user_id: userId,
      p_amount: credits,
      p_transaction_type: 'purchase',
      p_description: `${credits} credits purchase`,
      p_metadata: {
        stripe_payment_intent_id: paymentIntent.id,
        price_paid: paymentIntent.amount // in cents
      }
    });

    if (error) {
      console.error('❌ RPC Error:', error);
      throw error;
    }
    
    console.log('✅ Credits added successfully!');
    
    // Send purchase confirmation email
    try {
      // Get user profile for email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, first_name')
        .eq('id', userId)
        .single();
      
      if (profile) {
        await emailService.sendPurchaseEmail({
          email: profile.email,
          firstName: profile.first_name,
          purchaseType: 'credits',
          amount: paymentIntent.amount,
          credits: credits,
        });
      }
    } catch (emailError) {
      console.error('Failed to send purchase email:', emailError);
      // Don't fail the webhook if email fails
    }
  } catch (err) {
    console.error('❌ Exception in handlePaymentIntentSucceeded:', err);
    throw err;
  }
}

async function handlePaymentIntentFailed(paymentIntent: any) {
  const userId = paymentIntent.metadata?.userId;
  if (!userId) return;

  // Payment failed - could implement notification logic here
  // TODO: Send email notification about failed payment
}

async function handleCheckoutSessionCompleted(session: any) {
  const userId = session.metadata?.userId;
  if (!userId) return;

  // Handle subscription checkout
  if (session.mode === 'subscription') {
    const subscriptionId = session.subscription;
    const customerId = session.customer;

    // Update user profile with Stripe customer ID and subscription
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
      })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    // Get subscription details to update plan
    const subscription = await stripeService.getSubscription(subscriptionId);
    if (subscription) {
      const priceId = subscription.items.data[0]?.price.id;
      const plans = stripeService.getSubscriptionPlans();
      const plan = plans.find((p: any) => p.stripePriceId === priceId);
      
      if (plan) {
        // Update subscription plan and status
        const { error: planError } = await supabase
          .from('profiles')
          .update({
            subscription_plan: plan.id,
            subscription_status: plan.id, // Set status to plan name (basic, starter, etc)
          })
          .eq('id', userId);

        if (planError) {
          throw planError;
        }

        // Add initial credits
        if (plan.creditsPerMonth) {
          const { error: creditError } = await supabase.rpc('add_user_credits', {
            p_user_id: userId,
            p_amount: plan.creditsPerMonth,
            p_transaction_type: 'subscription',
            p_description: `${plan.name} subscription`,
            p_metadata: {
              stripe_session_id: session.id,
              stripe_subscription_id: subscriptionId,
              price_paid: session.amount_total || 0
            }
          });

          if (creditError) {
            throw creditError;
          }
        }
        
        // Send subscription confirmation email
        try {
          // Get user profile for email
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, first_name')
            .eq('id', userId)
            .single();
          
          if (profile) {
            await emailService.sendSubscriptionEmail({
              email: profile.email,
              firstName: profile.first_name,
              action: 'created',
              planName: plan.name,
              nextBillingDate: new Date(subscription.current_period_end * 1000),
            });
            
            // Also send purchase confirmation
            await emailService.sendPurchaseEmail({
              email: profile.email,
              firstName: profile.first_name,
              purchaseType: 'subscription',
              amount: session.amount_total || 0,
              planName: plan.name,
              invoiceUrl: session.url,
            });
          }
        } catch (emailError) {
          console.error('Failed to send subscription email:', emailError);
          // Don't fail the webhook if email fails
        }
      }
    }
  }
  // For one-time payments, the payment_intent.succeeded will handle credit addition
}

async function handleTrialWillEnd(subscription: any) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  // Trial ending in 3 days - send reminder email
  // TODO: Implement email notification
}

async function handleInvoicePaymentFailed(invoice: any) {
  const userId = invoice.metadata?.userId;
  if (!userId) return;

  // Subscription payment failed
  // TODO: Send email notification and update subscription status
  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'past_due',
    })
    .eq('id', userId);

  if (error) {
    throw error;
  }
} 