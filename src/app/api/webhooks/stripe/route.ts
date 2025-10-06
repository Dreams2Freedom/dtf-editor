import { NextRequest, NextResponse } from 'next/server';
import { getStripeService } from '@/services/stripe';
import { emailService } from '@/services/email';
import { goHighLevelService } from '@/services/goHighLevel';
import { createClient } from '@supabase/supabase-js';
import { ApiCostTracker } from '@/lib/api-cost-tracker';
import { trackReferralConversion } from '@/services/affiliate';

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

// Helper function to update GoHighLevel tags based on purchase type
async function updateGoHighLevelTags(
  email: string,
  purchaseType: 'subscription' | 'credits',
  planName?: string
) {
  try {
    console.log('🏷️ Updating GoHighLevel tags for:', email, purchaseType);

    // First, find or create the contact
    const contactResult = await goHighLevelService.createContact({
      email,
      firstName: '',
      tags: [], // Will be updated below
    });

    if (!contactResult.success) {
      console.error(
        'Failed to find/create GoHighLevel contact:',
        contactResult.error
      );
      return;
    }

    // Prepare tags based on purchase type
    const tagsToAdd: string[] = ['customer'];
    const tagsToRemove: string[] = ['free-account'];

    if (purchaseType === 'subscription') {
      tagsToAdd.push('customer-subscription');
      if (planName) {
        tagsToAdd.push(`subscription-${planName.toLowerCase()}`);
      }
    } else if (purchaseType === 'credits') {
      tagsToAdd.push('customer-credits');
      tagsToAdd.push('pay-as-you-go');
    }

    // Update tags (Note: GoHighLevel v1 API doesn't have a remove tags endpoint,
    // so we'll update the contact with new tags)
    console.log('🏷️ Adding tags:', tagsToAdd);
    console.log('🏷️ Removing tags:', tagsToRemove);

    // Create contact with updated tags
    await goHighLevelService.createContact({
      email,
      firstName: '',
      tags: tagsToAdd,
      customFields: {
        lastPurchase: new Date().toISOString(),
        purchaseType: purchaseType,
        customerStatus: 'active',
      },
    });

    console.log('✅ GoHighLevel tags updated successfully');
  } catch (error) {
    console.error('Error updating GoHighLevel tags:', error);
    // Don't throw - we don't want to fail the webhook if GoHighLevel update fails
  }
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

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object);
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
      {
        error: 'Webhook signature verification failed',
        details: error.message,
      },
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
      if (
        profile.stripe_subscription_id &&
        profile.stripe_subscription_id !== subscription.id
      ) {
        console.log(
          '⚠️ New subscription detected, different from stored:',
          profile.stripe_subscription_id
        );

        // Check if the old subscription should be cancelled
        try {
          const stripeService = getStripeService();
          const oldSub = await stripeService.getSubscription(
            profile.stripe_subscription_id
          );

          if (
            oldSub &&
            (oldSub.status === 'active' || oldSub.status === 'trialing')
          ) {
            console.log(
              '🔄 Cancelling old subscription:',
              profile.stripe_subscription_id
            );
            await stripeService.cancelSubscription(
              profile.stripe_subscription_id
            );
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
    updateData.subscription_current_period_end = new Date(
      subscription.current_period_end * 1000
    ).toISOString();
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
      const {
        data: { user },
        error: userError,
      } = await getSupabase().auth.admin.getUserById(userId);

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
        console.log(
          '📧 Sending subscription confirmation email to:',
          user.email
        );
        const emailSent = await emailService.sendSubscriptionEmail({
          email: user.email,
          firstName: profile?.first_name,
          action: 'created',
          planName: plan.name,
          nextBillingDate: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : undefined,
        });
        console.log('📧 Subscription email sent result:', emailSent);

        // Update GoHighLevel tags for subscription purchase
        await updateGoHighLevelTags(user.email, 'subscription', plan.name);
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
    const subscription = await getStripeService().getSubscription(
      invoice.subscription
    );
    if (subscription) {
      // Update the billing period in profiles
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (subscription.current_period_start) {
        updateData.stripe_current_period_start = new Date(
          subscription.current_period_start * 1000
        ).toISOString();
      }
      if (subscription.current_period_end) {
        updateData.stripe_current_period_end = new Date(
          subscription.current_period_end * 1000
        ).toISOString();
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
        const response = await fetch(
          `${env.NEXT_PUBLIC_APP_URL}/api/credits/reset`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': env.SUPABASE_SERVICE_ROLE_KEY,
            },
            body: JSON.stringify({ userId }),
          }
        );

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

  // IMPORTANT: Credits are now added in checkout.session.completed to prevent duplicates
  // This handler now only sends confirmation emails for direct payment intents
  // that don't go through Checkout (if any exist in your flow)

  const userId = paymentIntent.metadata?.userId;
  const credits = parseInt(paymentIntent.metadata?.credits || '0');

  console.log('User ID:', userId);
  console.log('Credits in metadata:', credits);
  console.log(
    '⚠️ NOTE: Credits are added via checkout.session.completed, not here'
  );

  if (!userId) {
    console.log('⚠️ No userId, skipping');
    return;
  }

  try {
    // DON'T add credits here - they're added in checkout.session.completed
    // This prevents duplicate credit allocation (BUG-054)
    console.log(
      '✅ Payment intent processed (credits handled by checkout.session)'
    );

    // Send purchase confirmation email
    try {
      console.log('📧 Attempting to send payment intent purchase email...');

      // Get user email from auth
      const {
        data: { user },
        error: userError,
      } = await getSupabase().auth.admin.getUserById(userId);

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

        // Update GoHighLevel tags for credit purchase
        await updateGoHighLevelTags(user.email, 'credits');
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

async function handleChargeRefunded(charge: any) {
  console.log('💳 handleChargeRefunded called');
  console.log('Charge ID:', charge.id);
  console.log('Refunded amount:', charge.amount_refunded);
  console.log('Payment Intent:', charge.payment_intent);

  // Get metadata from the original payment intent
  const userId = charge.metadata?.userId;
  const credits = parseInt(charge.metadata?.credits || '0');

  console.log('User ID:', userId);
  console.log('Credits to deduct:', credits);

  if (!userId || !credits) {
    console.log('⚠️ Missing userId or credits in refund, skipping');
    return;
  }

  try {
    // Calculate how many credits to deduct based on refund amount
    const refundPercentage = charge.amount_refunded / charge.amount;
    const creditsToDeduct = Math.ceil(credits * refundPercentage);

    console.log(`📝 Deducting ${creditsToDeduct} credits due to refund`);

    // Deduct credits from the user
    const { data: profile, error: fetchError } = await getSupabase()
      .from('profiles')
      .select('credits_remaining')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching profile:', fetchError);
      throw fetchError;
    }

    const currentCredits = profile.credits_remaining || 0;
    const newCredits = Math.max(0, currentCredits - creditsToDeduct); // Don't go negative

    const { error: updateError } = await getSupabase()
      .from('profiles')
      .update({ credits_remaining: newCredits })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Error updating credits:', updateError);
      throw updateError;
    }

    // Log the transaction
    const { error: transactionError } = await getSupabase()
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: -creditsToDeduct,
        transaction_type: 'refund',
        description: `Refund: ${creditsToDeduct} credits deducted`,
        metadata: {
          stripe_charge_id: charge.id,
          stripe_payment_intent_id: charge.payment_intent,
          refund_amount: charge.amount_refunded,
        },
      });

    if (transactionError) {
      console.log('Note: Could not log transaction:', transactionError.message);
    }

    console.log(
      `✅ Credits deducted successfully! ${currentCredits} → ${newCredits}`
    );

    // Send refund notification email
    try {
      const {
        data: { user },
        error: userError,
      } = await getSupabase().auth.admin.getUserById(userId);

      if (user?.email) {
        // Get user's first name from profile
        const { data: userProfile } = await getSupabase()
          .from('profiles')
          .select('first_name')
          .eq('id', userId)
          .single();

        await emailService.sendRefundEmail({
          email: user.email,
          firstName: userProfile?.first_name,
          refundAmount: charge.amount_refunded / 100, // Convert from cents
          creditDeducted: creditsToDeduct,
          originalPaymentDate: new Date(charge.created * 1000), // Convert from Unix timestamp
        });
        console.log('📧 Refund notification sent to:', user.email);
      }
    } catch (emailError) {
      console.error('Error sending refund email:', emailError);
    }
  } catch (err) {
    console.error('❌ Failed to process refund:', err);
    throw err;
  }
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
    const subscription =
      await getStripeService().getSubscription(subscriptionId);
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
          const { error: creditError } = await getSupabase().rpc(
            'add_user_credits',
            {
              p_user_id: userId,
              p_amount: plan.creditsPerMonth,
              p_transaction_type: 'subscription',
              p_description: `${plan.name} subscription`,
              p_metadata: {
                stripe_session_id: session.id,
                stripe_subscription_id: subscriptionId,
                price_paid: session.amount_total || 0,
              },
            }
          );

          if (creditError) {
            throw creditError;
          }
        }

        // Track affiliate conversion for subscription
        try {
          const paymentAmount = (session.amount_total || 0) / 100; // Convert from cents to dollars
          await trackReferralConversion(
            userId,
            paymentAmount,
            session.payment_intent as string,
            plan.id // subscription plan
          );
          console.log('✅ Tracked affiliate conversion for subscription');
        } catch (affiliateError) {
          console.error(
            '❌ Error tracking affiliate conversion:',
            affiliateError
          );
          // Don't fail the webhook if affiliate tracking fails
        }

        // Track Stripe subscription payment costs
        try {
          await ApiCostTracker.logUsage({
            userId,
            provider: 'stripe',
            operation: 'payment_processing',
            status: 'success',
            creditsCharged: 0, // No credits charged for payment processing
            userPlan: plan.id,
            stripeAmount: session.amount_total || 0, // Pass the amount for Stripe fee calculation
            metadata: {
              sessionId: session.id,
              paymentMode: 'subscription',
              subscriptionId: subscriptionId,
              planName: plan.name,
              amountCents: session.amount_total || 0,
            },
          });
          console.log('💰 Stripe subscription cost tracked');
        } catch (costError) {
          console.error('Error tracking Stripe costs:', costError);
          // Don't fail the webhook if cost tracking fails
        }

        // Send subscription confirmation email
        try {
          console.log('📧 Attempting to send subscription email...');

          // Get user email from auth
          const {
            data: { user },
            error: userError,
          } = await getSupabase().auth.admin.getUserById(userId);

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
        // Update customer ID and set credit expiration (90 days for pay-as-you-go)
        const creditExpirationDate = new Date();
        creditExpirationDate.setDate(creditExpirationDate.getDate() + 90); // 90 days from purchase

        if (customerId) {
          await getSupabase()
            .from('profiles')
            .update({
              stripe_customer_id: customerId,
              credit_expires_at: creditExpirationDate.toISOString(), // Set 90-day expiration for storage
            })
            .eq('id', userId);
        } else {
          // Even without customer ID, set the credit expiration
          await getSupabase()
            .from('profiles')
            .update({
              credit_expires_at: creditExpirationDate.toISOString(),
            })
            .eq('id', userId);
        }

        // Add credits
        const { error: creditError } = await getSupabase().rpc(
          'add_user_credits',
          {
            p_user_id: userId,
            p_amount: credits,
            p_transaction_type: 'purchase',
            p_description: `${credits} credits purchase`,
            p_metadata: {
              stripe_session_id: session.id,
              price_paid: session.amount_total || 0,
            },
          }
        );

        if (creditError) {
          console.error('❌ Credit addition error:', creditError);
          throw creditError;
        }

        console.log('✅ Credits added successfully from checkout session!');

        // Track affiliate conversion for one-time purchase
        try {
          const paymentAmount = (session.amount_total || 0) / 100; // Convert from cents to dollars
          await trackReferralConversion(
            userId,
            paymentAmount,
            session.payment_intent as string,
            undefined // one-time purchase, not subscription
          );
          console.log('✅ Tracked affiliate conversion for one-time purchase');
        } catch (affiliateError) {
          console.error(
            '❌ Error tracking affiliate conversion:',
            affiliateError
          );
          // Don't fail the webhook if affiliate tracking fails
        }

        // Track Stripe payment processing costs
        try {
          // Get user plan for cost tracking
          const { data: userProfile } = await getSupabase()
            .from('profiles')
            .select('subscription_plan')
            .eq('id', userId)
            .single();

          const userPlan = userProfile?.subscription_plan || 'free';

          // Log Stripe API cost (2.9% + $0.30)
          await ApiCostTracker.logUsage({
            userId,
            provider: 'stripe',
            operation: 'payment_processing',
            status: 'success',
            creditsCharged: 0, // No credits charged for payment processing
            userPlan,
            stripeAmount: session.amount_total || 0, // Pass the amount for Stripe fee calculation
            metadata: {
              sessionId: session.id,
              paymentMode: 'credits',
              amountCents: session.amount_total || 0,
              creditsAdded: credits,
            },
          });
          console.log('💰 Stripe payment cost tracked');
        } catch (costError) {
          console.error('Error tracking Stripe costs:', costError);
          // Don't fail the webhook if cost tracking fails
        }

        // Send purchase confirmation email
        try {
          console.log('📧 Attempting to fetch user for email...');

          // Get user email from auth
          const {
            data: { user },
            error: userError,
          } = await getSupabase().auth.admin.getUserById(userId);

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

            // Update GoHighLevel tags for credit purchase
            await updateGoHighLevelTags(user.email, 'credits');
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
    const {
      data: { user },
      error: userError,
    } = await getSupabase().auth.admin.getUserById(userId);

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
        amount: invoice.amount_due,
      });
      console.log('📧 Payment failed email sent result:', emailSent);
    }
  } catch (emailError) {
    console.error('Failed to send payment failed email:', emailError);
    // Don't fail the webhook if email fails
  }
}
