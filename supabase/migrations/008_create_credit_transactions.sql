-- Create credit_transactions table for tracking all credit movements
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'reset', 'manual', 'subscription')),
  description TEXT,
  balance_after INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);

-- Add last_credit_reset to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_credit_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add credit_expires_at for pay-as-you-go credits
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS credit_expires_at TIMESTAMP WITH TIME ZONE;

-- RLS policies for credit_transactions
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view own credit transactions" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Only system can insert transactions (via service role)
CREATE POLICY "System can manage credit transactions" ON credit_transactions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to add credit transaction with automatic balance calculation
CREATE OR REPLACE FUNCTION add_credit_transaction(
  p_user_id UUID,
  p_amount INTEGER,
  p_type VARCHAR(50),
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS credit_transactions AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_transaction credit_transactions;
BEGIN
  -- Get current balance
  SELECT credits_remaining INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- Calculate new balance
  IF p_type IN ('purchase', 'refund', 'reset', 'manual', 'subscription') THEN
    v_new_balance := v_current_balance + p_amount;
  ELSIF p_type = 'usage' THEN
    v_new_balance := v_current_balance - p_amount;
  ELSE
    RAISE EXCEPTION 'Invalid transaction type: %', p_type;
  END IF;

  -- Ensure balance doesn't go negative
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient credits. Current: %, Required: %', v_current_balance, p_amount;
  END IF;

  -- Update user balance
  UPDATE profiles
  SET credits_remaining = v_new_balance
  WHERE id = p_user_id;

  -- Insert transaction record
  INSERT INTO credit_transactions (
    user_id, amount, type, description, balance_after, metadata
  ) VALUES (
    p_user_id, p_amount, p_type, p_description, v_new_balance, p_metadata
  ) RETURNING * INTO v_transaction;

  RETURN v_transaction;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset monthly credits for free users
CREATE OR REPLACE FUNCTION reset_monthly_credits(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  credits_added INTEGER,
  new_balance INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH eligible_users AS (
    SELECT 
      p.id,
      p.subscription_status,
      p.last_credit_reset,
      p.credits_remaining
    FROM profiles p
    WHERE 
      -- If specific user provided, filter by that
      (p_user_id IS NULL OR p.id = p_user_id)
      -- Only free tier users
      AND (p.subscription_status IS NULL OR p.subscription_status = 'free')
      -- Last reset was more than 30 days ago
      AND (
        p.last_credit_reset IS NULL 
        OR p.last_credit_reset < NOW() - INTERVAL '30 days'
      )
  ),
  updated_users AS (
    UPDATE profiles p
    SET 
      credits_remaining = 2,  -- Free tier gets 2 credits
      last_credit_reset = NOW()
    FROM eligible_users eu
    WHERE p.id = eu.id
    RETURNING p.id, 2 as credits_added, p.credits_remaining
  )
  -- Add transaction records
  INSERT INTO credit_transactions (user_id, amount, type, description, balance_after)
  SELECT 
    uu.id,
    uu.credits_added,
    'reset',
    'Monthly credit reset for free tier',
    uu.credits_remaining
  FROM updated_users uu
  RETURNING 
    credit_transactions.user_id,
    credit_transactions.amount as credits_added,
    credit_transactions.balance_after as new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_credit_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION reset_monthly_credits TO service_role;