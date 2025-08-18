import { NextRequest, NextResponse } from 'next/server';
import { getStripeService } from '@/services/stripe';
import { emailService } from '@/services/email';
import { createClient } from '@supabase/supabase-js';

// Lazy initialize Supabase to avoid build-time errors
let supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables are required');
    }
    
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

export async function POST(request: NextRequest) {
  console.log('\n🔔 STRIPE WEBHOOK RECEIVED');
  console.log('📍 Webhook URL:', request.url);
  console.log('🕐 Timestamp:', new Date().toISOString());
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
    const event = getStripeService().constructWebhookEvent(body, signature);
    console.log('✅ Webhook signature verified');
    console.log('📨 Event type:', event.type);
    console.log('📨 Event ID:', event.id);
    console.log('📨 Event data:', JSON.stringify(event.data.object, null, 2));

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

    console.log('✅ Webhook processed successfully');
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    console.error('Error details:', error.message);
    return NextResponse.json(
      { error: 'Webhook signature verification failed', details: error.message },
      { status: 400 }
    );
  }
}

async function handleSubscriptionEvent(subscription: any) {
  console.log('📊 Handling subscription event');
  console.log('Event type:', subscription.status);
  console.log('Customer ID:', subscription.customer);
  console.log('Subscription ID:', subscription.id);
  
  let userId = subscription.metadata?.userId;
  
  // If no userId in metadata, try to find it by customer ID
  if (!userId && subscription.customer) {
    const { data: profile } = await getSupabase()
      .from('profiles')
      .select('id, stripe_subscription_id')
      .eq('stripe_customer_id', subscription.customer)
      .single();
    
    if (profile) {
      userId = profile.id;
      console.log('Found userId from customer ID:', userId);
      
      // Check if this is a different subscription than what we have on file
      if (profile.stripe_subscription_id && profile.stripe_subscription_id !== subscription.id) {
        console.log('⚠️ New subscription detected, different from stored:', profile.stripe_subscription_id);
        
        // Check if the old subscription should be cancelled
        try {
          const stripeService = getStripeService();
          const oldSub = await stripeService.getSubscription(profile.stripe_subscription_id);
          
          if (oldSub && (oldSub.status === 'active' || oldSub.status === 'trialing')) {
            console.log('🔄 Cancelling old subscription:', profile.stripe_subscription_id);
            await stripeService.cancelSubscription(profile.stripe_subscription_id);
          }
        } catch (error) {
          console.error('Error checking old subscription:', error);
          // Continue anyway - the old subscription might already be cancelled
        }
      }
    }
  }
  
  if (!userId) {
    console.error('❌ Could not find userId for subscription event');
    return;
  }

  // Get the price ID from the subscription
  const priceId = subscription.items?.data?.[0]?.price?.id;
  
  // Determine the plan based on the price ID
  const stripeService = getStripeService();
  const plans = stripeService.getSubscriptionPlans();
  const plan = plans.find((p: any) => p.stripePriceId === priceId);
  
  const updateData: any = {
    stripe_subscription_id: subscription.id,
  };
  
  // Only add period end if it exists
  if (subscription.current_period_end) {
    updateData.subscription_current_period_end = new Date(subscription.current_period_end * 1000).toISOString();
  }

  // If we found a matching plan, update both status and plan
  if (plan) {
    updateData.subscription_status = plan.id; // 'basic', 'starter', etc.
    updateData.subscription_plan = plan.id;
  }

  // Handle cancelled subscriptions
  if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
    updateData.subscription_status = 'cancelled';
    updateData.subscription_plan = 'free';
  }

  const { error } = await getSupabase()
    .from('profiles')
    .update(updateData)
    .eq('id', userId);

  if (error) {
    console.error('❌ Error updating subscription:', error);
    throw error;
  }
  
  console.log('✅ Subscription updated for user:', userId);
  
  // Send subscription confirmation email for new subscriptions
  if (subscription.status === 'active' && !subscription.cancel_at_period_end) {
    try {
      // Get user details for email
      const { data: { user }, error: userError } = await getSupabase().auth.admin.getUserById(userId);
      
      if (userError) {
        console.error('❌ Error fetching user for email:', userError);
      }
      
      // Get user profile for first name
      const { data: profile } = await getSupabase()
        .from('profiles')
        .select('first_name')
        .eq('id', userId)
        .single();
      
      if (user?.email && plan) {
        console.log('📧 Sending subscription confirmation email to:', user.email);
        const emailSent = await emailService.sendSubscriptionEmail({
          email: user.email,
          firstName: profile?.first_name,
          action: 'created',
          planName: plan.name,
          nextBillingDate: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : undefined
        });
        console.log('📧 Subscription email sent result:', emailSent);
      }
    } catch (emailError) {
      console.error('Failed to send subscription email:', emailError);
      // Don't fail the webhook if email fails
    }
  }
}

async function handleSubscriptionCancellation(subscription: any) {
  console.log('🚫 Handling subscription cancellation');
  console.log('Subscription ID:', subscription.id);
  console.log('Customer ID:', subscription.customer);
  
  let userId = subscription.metadata?.userId;
  
  // If no userId in metadata, try to find it by customer ID
  if (!userId && subscription.customer) {
    const { data: profile } = await getSupabase()
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', subscription.customer)
      .single();
    
    if (profile) {
      userId = profile.id;
      console.log('Found userId from customer ID:', userId);
    }
  }
  
  if (!userId) {
    console.error('❌ Could not find userId for subscription cancellation');
    return;
  }

  const { error } = await getSupabase()
    .from('profiles')
    .update({
      subscription_status: 'canceled',
      subscription_plan: 'free', // Reset to free plan
      subscription_canceled_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('❌ Error updating subscription status:', error);
    throw error;
  }
  
  console.log('✅ Subscription cancelled for user:', userId);
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  const userId = invoice.metadata?.userId;
  if (!userId) return;

  // Handle subscription renewal
  if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
    // Update subscription billing period dates
    const subscription = await getStripeService().getSubscription(invoice.subscription);
    if (subscription) {
      // Update the billing period in profiles
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (subscription.current_period_start) {
        updateData.stripe_current_period_start = new Date(subscription.current_period_start * 1000).toISOString();
      }
      if (subscription.current_period_end) {
        updateData.stripe_current_period_end = new Date(subscription.current_period_end * 1000).toISOString();
      }
      
      const { error: updateError } = await getSupabase()
        .from('profiles')
        .update(updateData)
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
    const { error } = await getSupabase().rpc('add_user_credits', {
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
      console.log('📧 Attempting to send payment intent purchase email...');
      
      // Get user email from auth
      const { data: { user }, error: userError } = await getSupabase().auth.admin.getUserById(userId);
      
      if (userError) {
        console.error('❌ Error fetching user:', userError);
      }
      
      // Get first name from profile
      const { data: profile } = await getSupabase()
        .from('profiles')
        .select('first_name')
        .eq('id', userId)
        .single();
      
      if (user?.email) {
        console.log('📧 Sending purchase email to:', user.email);
        const emailSent = await emailService.sendPurchaseEmail({
          email: user.email,
          firstName: profile?.first_name || '',
          purchaseType: 'credits',
          amount: paymentIntent.amount,
          credits: credits,
          invoiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        });
        console.log('📧 Email sent result:', emailSent);
      } else {
        console.error('❌ No user email found');
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
  console.log('🎯 handleCheckoutSessionCompleted called');
  console.log('Session ID:', session.id);
  console.log('Session metadata:', session.metadata);
  console.log('Session mode:', session.mode);
  
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error('❌ No userId in session metadata');
    return;
  }
  
  console.log('👤 Processing for user:', userId);

  // Handle subscription checkout
  if (session.mode === 'subscription') {
    const subscriptionId = session.subscription;
    const customerId = session.customer;

    // Update user profile with Stripe customer ID and subscription
    const { error: updateError } = await getSupabase()
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
    const subscription = await getStripeService().getSubscription(subscriptionId);
    if (subscription) {
      const priceId = subscription.items.data[0]?.price.id;
      const plans = getStripeService().getSubscriptionPlans();
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
          const { error: creditError } = await getSupabase().rpc('add_user_credits', {
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
          console.log('📧 Attempting to send subscription email...');
          
          // Get user email from auth
          const { data: { user }, error: userError } = await getSupabase().auth.admin.getUserById(userId);
          
          if (userError) {
            console.error('❌ Error fetching user:', userError);
          }
          
          // Get first name from profile
          const { data: profile } = await getSupabase()
            .from('profiles')
            .select('first_name')
            .eq('id', userId)
            .single();
          
          if (user?.email) {
            console.log('📧 Sending subscription email to:', user.email);
            await emailService.sendSubscriptionEmail({
              email: user.email,
              firstName: profile?.first_name || '',
              action: 'created',
              planName: plan.name,
              nextBillingDate: new Date(subscription.current_period_end * 1000),
            });
            
            // Also send purchase confirmation
            await emailService.sendPurchaseEmail({
              email: user.email,
              firstName: profile?.first_name || '',
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
  
  // Handle one-time payment (pay-as-you-go credits)
  if (session.mode === 'payment') {
    console.log('🎯 Processing pay-as-you-go payment from checkout session');
    
    const credits = parseInt(session.metadata?.credits || '0');
    const customerId = session.customer;
    
    if (credits > 0) {
      try {
        // Update customer ID if not already set
        if (customerId) {
          await getSupabase()
            .from('profiles')
            .update({ stripe_customer_id: customerId })
            .eq('id', userId);
        }
        
        // Add credits
        const { error: creditError } = await getSupabase().rpc('add_user_credits', {
          p_user_id: userId,
          p_amount: credits,
          p_transaction_type: 'purchase',
          p_description: `${credits} credits purchase`,
          p_metadata: {
            stripe_session_id: session.id,
            price_paid: session.amount_total || 0
          }
        });
        
        if (creditError) {
          console.error('❌ Credit addition error:', creditError);
          throw creditError;
        }
        
        console.log('✅ Credits added successfully from checkout session!');
        
        // Send purchase confirmation email
        try {
          console.log('📧 Attempting to fetch user for email...');
          
          // Get user email from auth
          const { data: { user }, error: userError } = await getSupabase().auth.admin.getUserById(userId);
          
          if (userError) {
            console.error('❌ Error fetching user:', userError);
          }
          
          // Get first name from profile
          const { data: profile } = await getSupabase()
            .from('profiles')
            .select('first_name')
            .eq('id', userId)
            .single();
          
          if (user?.email) {
            console.log('📧 Sending purchase email to:', user.email);
            const emailSent = await emailService.sendPurchaseEmail({
              email: user.email,
              firstName: profile?.first_name || '',
              purchaseType: 'credits',
              amount: session.amount_total || 0,
              credits: credits,
              invoiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
            });
            console.log('📧 Email sent result:', emailSent);
          } else {
            console.error('❌ No user email found for user:', userId);
          }
        } catch (emailError) {
          console.error('❌ Failed to send purchase email:', emailError);
          // Don't fail the webhook if email fails
        }
      } catch (error) {
        console.error('Error processing pay-as-you-go payment:', error);
        throw error;
      }
    }
  }
}

async function handleTrialWillEnd(subscription: any) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  // Trial ending in 3 days - send reminder email
  // TODO: Implement email notification
}

async function handleInvoicePaymentFailed(invoice: any) {
  console.log('💳❌ Handling failed payment for invoice:', invoice.id);
  
  // Try to get userId from metadata or customer lookup
  let userId = invoice.metadata?.userId;
  
  if (!userId && invoice.customer) {
    const { data: profile } = await getSupabase()
      .from('profiles')
      .select('id, subscription_plan')
      .eq('stripe_customer_id', invoice.customer)
      .single();
    
    if (profile) {
      userId = profile.id;
    }
  }
  
  if (!userId) {
    console.error('❌ Could not find userId for failed payment');
    return;
  }

  // Update subscription status to past_due
  const { error } = await getSupabase()
    .from('profiles')
    .update({
      subscription_status: 'past_due',
    })
    .eq('id', userId);

  if (error) {
    throw error;
  }
  
  // Send failed payment notification email
  try {
    // Get user details
    const { data: { user }, error: userError } = await getSupabase().auth.admin.getUserById(userId);
    
    if (userError) {
      console.error('❌ Error fetching user for email:', userError);
    }
    
    // Get user profile for details
    const { data: profile } = await getSupabase()
      .from('profiles')
      .select('first_name, subscription_plan')
      .eq('id', userId)
      .single();
    
    if (user?.email) {
      // Determine attempt count from invoice
      const attemptCount = invoice.attempt_count || 1;
      
      // Get next retry date if available
      let nextRetryDate;
      if (invoice.next_payment_attempt) {
        nextRetryDate = new Date(invoice.next_payment_attempt * 1000);
      }
      
      // Get plan name
      const stripeService = getStripeService();
      const plans = stripeService.getSubscriptionPlans();
      const plan = plans.find((p: any) => p.id === profile?.subscription_plan);
      
      console.log('📧 Sending payment failed email to:', user.email);
      const emailSent = await emailService.sendPaymentFailedEmail({
        email: user.email,
        firstName: profile?.first_name,
        planName: plan?.name || profile?.subscription_plan || 'subscription',
        attemptCount: attemptCount,
        nextRetryDate: nextRetryDate,
        amount: invoice.amount_due
      });
      console.log('📧 Payment failed email sent result:', emailSent);
    }
  } catch (emailError) {
    console.error('Failed to send payment failed email:', emailError);
    // Don't fail the webhook if email fails
  }
} 