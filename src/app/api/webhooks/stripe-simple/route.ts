import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe with the secret key directly
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
});

// Initialize Supabase
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  console.log('🎯 Simple webhook handler called');
  
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('Event type:', event.type);

  // Handle checkout.session.completed for subscriptions
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const userId = session.metadata?.userId;
    
    console.log('Checkout session completed:', {
      mode: session.mode,
      userId,
      subscription: session.subscription,
      customer: session.customer
    });
    
    if (userId && session.mode === 'subscription') {
      try {
        // Update user profile with subscription info
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
          })
          .eq('id', userId);

        if (updateError) {
          console.error('Failed to update profile:', updateError);
          throw updateError;
        }

        // Get subscription details to determine plan
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const priceId = subscription.items.data[0]?.price.id;
        
        // Map price IDs to plans
        const planMap: Record<string, { plan: string, credits: number }> = {
          'price_1RleoYPHFzf1GpIrfy9RVk9m': { plan: 'basic', credits: 20 },
          'price_1RlepVPHFzf1GpIrjRiKHtvb': { plan: 'starter', credits: 60 }
        };
        
        const planInfo = planMap[priceId];
        
        if (planInfo) {
          // Update subscription plan
          const { error: planError } = await supabase
            .from('profiles')
            .update({
              subscription_plan: planInfo.plan,
              subscription_status: planInfo.plan,
            })
            .eq('id', userId);

          if (planError) {
            console.error('Failed to update plan:', planError);
            throw planError;
          }

          // Add subscription credits
          const { error: creditError } = await supabase.rpc('add_user_credits', {
            p_user_id: userId,
            p_amount: planInfo.credits,
            p_transaction_type: 'subscription',
            p_description: `${planInfo.plan} plan subscription`,
            p_metadata: {
              stripe_subscription_id: session.subscription,
              stripe_customer_id: session.customer
            }
          });

          if (creditError) {
            console.error('Failed to add credits:', creditError);
            throw creditError;
          }

          console.log(`✅ Subscription activated: ${planInfo.plan} plan with ${planInfo.credits} credits`);
        }
      } catch (err) {
        console.error('Failed to process subscription:', err);
        return NextResponse.json({ error: 'Failed to process subscription' }, { status: 500 });
      }
    }
  }

  // Handle payment_intent.succeeded
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const userId = paymentIntent.metadata?.userId;
    const credits = parseInt(paymentIntent.metadata?.credits || '0');

    if (userId && credits > 0) {
      console.log(`Adding ${credits} credits to user ${userId}`);
      
      try {
        const { error } = await supabase.rpc('add_user_credits', {
          p_user_id: userId,
          p_amount: credits,
          p_transaction_type: 'purchase',
          p_description: `${credits} credits purchase`,
          p_metadata: {
            stripe_payment_intent_id: paymentIntent.id,
            price_paid: paymentIntent.amount
          }
        });

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }

        console.log('✅ Credits added successfully!');
      } catch (err) {
        console.error('Failed to add credits:', err);
        return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 });
      }
    }
  }

  // Handle subscription updates (plan changes)
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as any;
    const customerId = subscription.customer;
    
    console.log('Subscription updated:', {
      id: subscription.id,
      status: subscription.status,
      customerId
    });
    
    try {
      // Find user by customer ID and get current plan
      const { data: profile, error: findError } = await supabase
        .from('profiles')
        .select('id, subscription_plan')
        .eq('stripe_customer_id', customerId)
        .single();
        
      if (findError || !profile) {
        console.error('Could not find user for customer:', customerId);
        return NextResponse.json({ received: true });
      }
      
      const priceId = subscription.items.data[0]?.price.id;
      
      // Map price IDs to plans
      const planMap: Record<string, { plan: string, credits: number }> = {
        'price_1RleoYPHFzf1GpIrfy9RVk9m': { plan: 'basic', credits: 20 },
        'price_1RlepVPHFzf1GpIrjRiKHtvb': { plan: 'starter', credits: 60 }
      };
      
      const planInfo = planMap[priceId];
      const currentPlanInfo = planMap[Object.keys(planMap).find(key => planMap[key].plan === profile.subscription_plan) || ''];
      
      if (planInfo) {
        // Update subscription plan
        const { error: planError } = await supabase
          .from('profiles')
          .update({
            subscription_plan: planInfo.plan,
            subscription_status: subscription.cancel_at_period_end ? 'cancelled' : planInfo.plan,
          })
          .eq('id', profile.id);

        if (planError) {
          console.error('Failed to update plan:', planError);
        } else {
          console.log(`✅ Subscription updated to ${planInfo.plan} plan`);
          
          // Calculate and add credit difference for upgrades
          if (currentPlanInfo && planInfo.credits > currentPlanInfo.credits) {
            const additionalCredits = planInfo.credits - currentPlanInfo.credits;
            console.log(`Adding ${additionalCredits} credits for upgrade from ${currentPlanInfo.plan} to ${planInfo.plan}`);
            
            const { error: creditError } = await supabase.rpc('add_user_credits', {
              p_user_id: profile.id,
              p_amount: additionalCredits,
              p_transaction_type: 'subscription_upgrade',
              p_description: `Upgrade from ${currentPlanInfo.plan} to ${planInfo.plan} plan`,
              p_metadata: {
                stripe_subscription_id: subscription.id,
                from_plan: currentPlanInfo.plan,
                to_plan: planInfo.plan
              }
            });

            if (creditError) {
              console.error('Failed to add upgrade credits:', creditError);
            } else {
              console.log(`✅ Added ${additionalCredits} credits for plan upgrade`);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to process subscription update:', err);
    }
  }

  return NextResponse.json({ received: true });
}