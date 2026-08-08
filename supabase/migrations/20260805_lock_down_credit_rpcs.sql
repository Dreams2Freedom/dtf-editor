-- SECURITY (critical): lock down credit-mutating RPCs to service_role only.
--
-- Several credit functions were EXECUTE-able by `anon` and/or `authenticated`
-- (or PUBLIC by default, when no GRANT was written), and take an arbitrary
-- `user_id`/`p_user_id` with no ownership check while running SECURITY DEFINER.
-- That let ANY client holding the public anon key mint/deduct credits for any
-- account with zero payment, e.g.:
--     supabase.rpc('refund_credits', { user_id: '<anyone>', credits: 999999, reason: 'x' })
--
-- Every LEGITIMATE caller of these functions is server-side and uses the
-- service-role key (src/services/imageProcessing.ts, the Stripe webhook, and
-- src/app/api/generate/image/route.ts), so restricting execute to service_role
-- closes the hole without breaking any real flow.
--
-- Signature-agnostic: revoke from PUBLIC/anon/authenticated and grant
-- service_role for EVERY overload of each named function in the public schema.

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'deduct_credits',
        'refund_credits',
        'deduct_credits_atomic',
        'refund_credits_atomic',
        'add_user_credits',
        'adjust_user_credits',
        'add_credits_bulk',
        'set_credits_bulk'
      )
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      fn.sig
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %s TO service_role',
      fn.sig
    );
  END LOOP;
END $$;
