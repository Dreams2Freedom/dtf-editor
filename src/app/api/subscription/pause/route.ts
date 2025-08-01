import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { stripeService } from '@/services/stripe';
import { emailService } from '@/services/email';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { duration } = await request.json();

    if (!duration || !['2_weeks', '1_month', '2_months'].includes(duration)) {
      return NextResponse.json(
        { error: 'Invalid pause duration' },
        { status: 400 }
      );
    }

    // Check eligibility
    const { data: eligibility, error: eligibilityError } = await supabase
      .rpc('check_pause_eligibility', { p_user_id: user.id });

    if (eligibilityError || !eligibility?.can_pause) {
      return NextResponse.json(
        { error: eligibility?.reason || 'Not eligible to pause subscription' },
        { status: 403 }
      );
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id || !profile?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Get current subscription to find billing period end
    let subscription;
    try {
      subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    } catch (err) {
      return NextResponse.json(
        { error: 'Failed to retrieve subscription details' },
        { status: 500 }
      );
    }

    // Calculate resume date from current period end, not from today
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    const resumeDate = new Date(currentPeriodEnd);
    
    switch (duration) {
      case '2_weeks':
        resumeDate.setDate(resumeDate.getDate() + 14);
        break;
      case '1_month':
        resumeDate.setMonth(resumeDate.getMonth() + 1);
        break;
      case '2_months':
        resumeDate.setMonth(resumeDate.getMonth() + 2);
        break;
    }

    console.log('Current billing period ends:', currentPeriodEnd);
    console.log('Subscription will resume on:', resumeDate);

    // Pause subscription in Stripe
    try {
      const updatedSubscription = await stripe.subscriptions.update(
        profile.stripe_subscription_id,
        {
          pause_collection: {
            behavior: 'void',
            resumes_at: Math.floor(resumeDate.getTime() / 1000)
          }
        }
      );

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          subscription_paused_until: resumeDate.toISOString(),
          pause_count: (profile.pause_count || 0) + 1,
          last_pause_date: new Date().toISOString(),
          subscription_status: 'paused'
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
      }

      // Log event
      await supabase
        .from('subscription_events')
        .insert({
          user_id: user.id,
          event_type: 'subscription_paused',
          event_data: {
            duration,
            pause_date: new Date().toISOString(),
            resume_date: resumeDate.toISOString(),
            stripe_subscription_id: profile.stripe_subscription_id
          }
        });

      // Send pause confirmation email
      try {
        await emailService.sendSubscriptionEmail({
          email: user.email!,
          firstName: profile.first_name,
          action: 'paused',
          planName: profile.subscription_plan || 'Basic',
          pauseUntil: resumeDate,
        });
      } catch (emailError) {
        console.error('Failed to send pause email:', emailError);
        // Don't fail the pause if email fails
      }

      return NextResponse.json({
        success: true,
        message: 'Subscription paused successfully',
        resumeDate: resumeDate.toISOString(),
        currentPeriodEnd: currentPeriodEnd.toISOString(),
        subscription: {
          id: updatedSubscription.id,
          status: updatedSubscription.status,
          pause_collection: updatedSubscription.pause_collection
        }
      });

    } catch (stripeError: any) {
      console.error('Stripe error:', stripeError);
      return NextResponse.json(
        { error: 'Failed to pause subscription: ' + stripeError.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error pausing subscription:', error);
    return NextResponse.json(
      { error: 'Failed to pause subscription' },
      { status: 500 }
    );
  }
}