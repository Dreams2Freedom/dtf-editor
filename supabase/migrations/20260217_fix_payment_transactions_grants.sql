-- Fix missing table grants on payment_transactions
-- The table was created but INSERT/SELECT grants were never applied,
-- causing "permission denied" errors from the webhook and admin API.

GRANT ALL ON payment_transactions TO service_role;
GRANT ALL ON payment_transactions TO postgres;
GRANT SELECT ON payment_transactions TO authenticated;
