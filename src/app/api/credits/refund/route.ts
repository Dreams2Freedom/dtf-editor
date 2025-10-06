import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/rate-limit';

async function handlePost(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { credits, reason } = await request.json();

    if (!credits || credits < 1) {
      return NextResponse.json(
        { error: 'Invalid credit amount' },
        { status: 400 }
      );
    }

    // Refund credits to user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits_remaining')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Failed to get user profile' },
        { status: 500 }
      );
    }

    const newCredits = profile.credits_remaining + credits;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits_remaining: newCredits })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to refund credits' },
        { status: 500 }
      );
    }

    // Log the refund
    await supabase.from('credit_transactions').insert({
      user_id: user.id,
      amount: credits,
      type: 'refund',
      description: reason || 'Credit refund',
      balance_after: newCredits,
    });

    return NextResponse.json({
      success: true,
      credits_remaining: newCredits,
    });
  } catch (error) {
    console.error('Credit refund error:', error);
    return NextResponse.json(
      { error: 'Failed to process refund' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const POST = withRateLimit(handlePost, 'api');
