-- Create payment_transactions table for complete payment audit trail
-- Following Context7 best practices for RLS and indexing

-- Create the table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe identifiers for complete audit trail
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT, -- NULL for one-time payments

  -- Payment details
  amount DECIMAL(10,2) NOT NULL, -- In dollars (not cents)
  currency TEXT DEFAULT 'usd',
  payment_type TEXT NOT NULL CHECK (payment_type IN ('subscription', 'one_time')),
  status TEXT DEFAULT 'completed',

  -- What they bought
  credits_purchased INTEGER,
  subscription_tier TEXT, -- 'basic', 'starter', 'professional'

  -- Metadata for flexibility
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes (Context7 best practice: index columns used in WHERE clauses)
-- Index on user_id for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id
  ON payment_transactions USING btree (user_id);

-- Index on created_at for date-based queries (DESC for most recent first)
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at
  ON payment_transactions USING btree (created_at DESC);

-- Index on checkout_session_id for idempotency checks
CREATE INDEX IF NOT EXISTS idx_payment_transactions_checkout_session
  ON payment_transactions USING btree (stripe_checkout_session_id);

-- Index on customer_id for Stripe customer lookups
CREATE INDEX IF NOT EXISTS idx_payment_transactions_customer_id
  ON payment_transactions USING btree (stripe_customer_id);

-- Enable Row Level Security
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own payment history
-- Following Context7 pattern: TO authenticated, using subqueries for performance
CREATE POLICY "Users can view own payment history"
  ON payment_transactions
  FOR SELECT
  TO authenticated
  USING ( (SELECT auth.uid()) = user_id );

-- RLS Policy: Admins can view all payments
-- Uses EXISTS subquery for better performance
CREATE POLICY "Admins can view all payments"
  ON payment_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.is_admin = true
    )
  );

-- RLS Policy: System can insert payment records (service role)
CREATE POLICY "Service role can insert payments"
  ON payment_transactions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Add trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_transactions_updated_at
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_transactions_updated_at();

-- Add comment for documentation
COMMENT ON TABLE payment_transactions IS 'Complete audit trail of all Stripe payments (subscriptions and one-time purchases)';
COMMENT ON COLUMN payment_transactions.stripe_checkout_session_id IS 'Unique identifier for idempotency - prevents duplicate payment logging';
COMMENT ON COLUMN payment_transactions.amount IS 'Payment amount in dollars (already converted from Stripe cents)';
COMMENT ON COLUMN payment_transactions.payment_type IS 'Type of payment: subscription (recurring) or one_time (pay-as-you-go credits)';
