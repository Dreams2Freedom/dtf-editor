-- Migration: Create deduct_credits / refund_credits RPC functions
-- Date: 2026-07-20
--
-- Why: src/services/imageProcessing.ts calls these two RPCs on every
-- credit-costing AI operation (upscale, background removal, vectorize), but
-- they were never present in this project's database. Each call failed with
-- "Could not find the function public.deduct_credits(...)" and fell through to
-- a non-atomic read-then-write fallback. Credits were still charged/refunded
-- correctly, but the fallback logged an error every time, took extra queries,
-- and could hit optimistic-lock conflicts under concurrent operations.
--
-- This restores the intended ATOMIC path. Behaviour matches what the code
-- already does (deduct/refund credits_remaining + write a credit_transactions
-- row); it does not touch Stripe, subscriptions, or the separate
-- deduct_credits_atomic/refund_credits_atomic functions used by AI generation.
--
-- Safe/idempotent: CREATE OR REPLACE + GRANT only. No data changes, no drops.
-- Already applied to production (project xysuxhdqukjtqgzetwps); committed here
-- so it is tracked and survives fresh environments.

CREATE OR REPLACE FUNCTION public.deduct_credits(
    user_id UUID,
    credits INTEGER,
    operation TEXT
)
RETURNS JSON AS $$
DECLARE
    v_current_credits INTEGER;
    v_new_credits INTEGER;
BEGIN
    -- Lock the row so concurrent operations can't double-spend.
    SELECT credits_remaining INTO v_current_credits
    FROM public.profiles
    WHERE id = user_id
    FOR UPDATE;

    IF v_current_credits IS NULL OR v_current_credits < credits THEN
        RETURN json_build_object(
            'success', false,
            'remaining_credits', COALESCE(v_current_credits, 0)
        );
    END IF;

    v_new_credits := v_current_credits - credits;

    UPDATE public.profiles
    SET credits_remaining = v_new_credits,
        updated_at = NOW()
    WHERE id = user_id;

    INSERT INTO public.credit_transactions (
        user_id, amount, type, description, metadata, balance_after
    ) VALUES (
        user_id,
        -credits,
        'usage',
        'Used for ' || operation,
        jsonb_build_object('operation', operation),
        v_new_credits
    );

    RETURN json_build_object('success', true, 'remaining_credits', v_new_credits);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.refund_credits(
    user_id UUID,
    credits INTEGER,
    reason TEXT
)
RETURNS VOID AS $$
DECLARE
    v_current_credits INTEGER;
    v_new_credits INTEGER;
BEGIN
    SELECT credits_remaining INTO v_current_credits
    FROM public.profiles
    WHERE id = user_id
    FOR UPDATE;

    v_new_credits := COALESCE(v_current_credits, 0) + credits;

    UPDATE public.profiles
    SET credits_remaining = v_new_credits,
        updated_at = NOW()
    WHERE id = user_id;

    INSERT INTO public.credit_transactions (
        user_id, amount, type, description, metadata, balance_after
    ) VALUES (
        user_id,
        credits,
        'refund',
        reason,
        jsonb_build_object('reason', reason),
        v_new_credits
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.deduct_credits(UUID, INTEGER, TEXT) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.refund_credits(UUID, INTEGER, TEXT) TO authenticated, service_role, anon;
