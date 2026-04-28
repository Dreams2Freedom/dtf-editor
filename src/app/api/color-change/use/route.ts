import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
// Import the plain types module directly to avoid pulling in the
// tool's index, which is a client-only adapter ('use client').
import { COLOR_CHANGE_LIMITS } from '@/tools/color-change/types';

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
      .select('color_changes_used, credits_remaining, subscription_status')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    const tier = profile.subscription_status || 'free';
    const limit = COLOR_CHANGE_LIMITS[tier] ?? COLOR_CHANGE_LIMITS.free;
    const used = profile.color_changes_used || 0;

    if (used < limit) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ color_changes_used: used + 1 })
        .eq('id', user.id);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update usage' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        allowed: true,
        remaining: limit - used - 1,
        creditCharged: false,
      });
    }

    const credits = profile.credits_remaining || 0;
    if (credits >= 1) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          color_changes_used: used + 1,
          credits_remaining: credits - 1,
        })
        .eq('id', user.id);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to deduct credit' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        allowed: true,
        remaining: 0,
        creditCharged: true,
      });
    }

    return NextResponse.json({
      allowed: false,
      remaining: 0,
      creditCharged: false,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
