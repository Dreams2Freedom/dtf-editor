import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Halftone usage gate.
 *
 * Halftoning runs entirely in the user's browser via @thi.ng/pixel-dither
 * (no upstream API call). This endpoint exists only to enforce the
 * subscription tier rule:
 *
 *   - Starter / Pro plans: free, unlimited halftones.
 *   - Free / Basic plans: 1 credit per halftone.
 *
 * Unlike /api/color-change/use, we don't track a per-month free counter
 * for paid plans (Starter+ get effectively unlimited). If pricing
 * gains a higher-tier-with-quota structure, mirror the
 * COLOR_CHANGE_LIMITS pattern and add a `halftones_used` column.
 */

const FREE_TIERS = new Set(['starter', 'pro']);

export async function POST(_request: NextRequest) {
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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits_remaining, subscription_status')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const tier = profile.subscription_status || 'free';

    // Starter / Pro: free pass.
    if (FREE_TIERS.has(tier)) {
      return NextResponse.json({
        allowed: true,
        remaining: -1, // sentinel: unlimited
        creditCharged: false,
      });
    }

    // Free / Basic / Cancelled: 1 credit per halftone.
    const credits = profile.credits_remaining || 0;
    if (credits >= 1) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits_remaining: credits - 1 })
        .eq('id', user.id);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to deduct credit' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        allowed: true,
        remaining: credits - 1,
        creditCharged: true,
      });
    }

    return NextResponse.json({
      allowed: false,
      remaining: 0,
      creditCharged: false,
      error:
        'Out of credits. Upgrade to Starter for unlimited halftones, or buy a credit pack.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
