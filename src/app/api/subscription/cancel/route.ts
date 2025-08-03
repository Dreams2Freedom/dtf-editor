import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';
import { emailService } from '@/services/email';

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

    const { reason } = await request.json();

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    try {
      // Cancel at period end (user keeps access until billing period ends)
      const subscription = await getStripe().subscriptions.update(
        profile.stripe_subscription_id,
        {
          cancel_at_period_end: true
        }
      );

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'cancelling',
          updated_at: new Date().toISOString()
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
          event_type: 'cancelled',
          event_data: {
            reason,
            cancel_at_period_end: true,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            stripe_subscription_id: profile.stripe_subscription_id
          }
        });

      // Send cancellation confirmation email
      try {
        await emailService.sendSubscriptionEmail({
          email: user.email!,
          firstName: profile.first_name,
          action: 'cancelled',
          planName: profile.subscription_plan || 'Basic',
          nextBillingDate: new Date(subscription.current_period_end * 1000),
        });
      } catch (emailError) {
        console.error('Failed to send cancellation email:', emailError);
        // Don't fail the cancellation if email fails
      }

      return NextResponse.json({
        success: true,
        message: 'Subscription cancelled successfully',
        subscription: {
          id: subscription.id,
          status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
        }
      });

    } catch (stripeError: any) {
      console.error('Stripe error:', stripeError);
      return NextResponse.json(
        { error: 'Failed to cancel subscription: ' + stripeError.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}