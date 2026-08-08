import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service';

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

// Number of read→decide→write attempts before giving up under contention.
const MAX_ATTEMPTS = 4;

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

    // Service-role client so the optimistic-lock deduction and the ledger
    // insert bypass RLS (mirrors the main-path ImageProcessingService). The
    // user is already authenticated above.
    const db = createServiceRoleSupabaseClient();

    // Optimistic-locking loop: commit the deduction only if the balance is
    // unchanged since we read it, retrying on conflict. Prevents two
    // concurrent requests from both reading balance N and both writing N-1
    // (a double-spend where the user gets two halftones for one credit).
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const { data: profile, error: profileError } = await db
        .from('profiles')
        .select('credits_remaining, subscription_status')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return NextResponse.json(
          { error: 'Profile not found' },
          { status: 404 }
        );
      }

      const tier = profile.subscription_status || 'free';

      // Starter / Pro: free pass, no mutation.
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
        const { data: updated, error: updateError } = await db
          .from('profiles')
          .update({ credits_remaining: credits - 1 })
          .eq('id', user.id)
          .eq('credits_remaining', credits) // optimistic lock on balance
          .select('credits_remaining')
          .single();

        // Balance changed under us → retry with the fresh balance.
        if (updateError || !updated) continue;

        // Record the spend in the ledger so credit history / analytics stay
        // consistent. Best-effort — the credit is already deducted, so a
        // ledger failure must not fail the request.
        const { error: ledgerError } = await db
          .from('credit_transactions')
          .insert({
            user_id: user.id,
            amount: -1,
            type: 'usage',
            description: 'Used for halftone',
            metadata: { operation: 'halftone' },
            balance_after: credits - 1,
          });
        if (ledgerError) {
          console.error(
            '[halftone/use] ledger insert failed:',
            ledgerError.message
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
    }

    // Exhausted retries under sustained contention.
    return NextResponse.json(
      { error: 'Usage conflict — please retry.' },
      { status: 409 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
