import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service';
// Import the plain types module directly to avoid pulling in the
// tool's index, which is a client-only adapter ('use client').
import { COLOR_CHANGE_LIMITS } from '@/tools/color-change/types';

// Number of read→decide→write attempts before giving up under contention.
// Each retry re-reads the balance so the decision reflects concurrent spend.
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

    // Perform the usage/credit mutation with the service-role client so the
    // optimistic-lock update and the credit_transactions ledger insert are
    // not subject to RLS (mirrors ImageProcessingService.deductCredits, the
    // proven main-path pattern). The user is already authenticated above.
    const db = createServiceRoleSupabaseClient();

    // Optimistic-locking loop: read the current usage/balance, then commit
    // conditionally on it being unchanged. If a concurrent request slipped in
    // between our read and write, the guarded update matches zero rows and we
    // retry with fresh values. This prevents two simultaneous requests from
    // both reading balance N and both writing N-1 (a double-spend / free op).
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const { data: profile, error: profileError } = await db
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
      const credits = profile.credits_remaining || 0;

      // Free monthly-quota path — no credit charge.
      if (used < limit) {
        const { data: updated, error: updateError } = await db
          .from('profiles')
          .update({ color_changes_used: used + 1 })
          .eq('id', user.id)
          .eq('color_changes_used', used) // optimistic lock
          .select('color_changes_used')
          .single();

        // No matching row → another request incremented the counter first.
        if (updateError || !updated) continue; // retry with fresh state

        return NextResponse.json({
          allowed: true,
          remaining: limit - used - 1,
          creditCharged: false,
        });
      }

      // Paid path — 1 credit per change once the free quota is exhausted.
      if (credits >= 1) {
        const { data: updated, error: updateError } = await db
          .from('profiles')
          .update({
            color_changes_used: used + 1,
            credits_remaining: credits - 1,
          })
          .eq('id', user.id)
          .eq('credits_remaining', credits) // optimistic lock on balance
          .eq('color_changes_used', used)
          .select('credits_remaining')
          .single();

        // Balance changed under us → retry with the fresh balance.
        if (updateError || !updated) continue;

        // Record the spend in the ledger so credit history / analytics stay
        // consistent with credits_remaining. Best-effort: the credit is
        // already deducted, so a ledger failure must not fail the request.
        const { error: ledgerError } = await db
          .from('credit_transactions')
          .insert({
            user_id: user.id,
            amount: -1,
            type: 'usage',
            description: 'Used for color change',
            metadata: { operation: 'color_change' },
            balance_after: credits - 1,
          });
        if (ledgerError) {
          console.error(
            '[color-change/use] ledger insert failed:',
            ledgerError.message
          );
        }

        return NextResponse.json({
          allowed: true,
          remaining: 0,
          creditCharged: true,
        });
      }

      // No free quota left and no credits — nothing to charge.
      return NextResponse.json({
        allowed: false,
        remaining: 0,
        creditCharged: false,
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
