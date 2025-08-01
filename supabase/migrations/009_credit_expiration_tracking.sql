-- Enhanced credit tracking with expiration dates and purchase history

-- Create credit_purchases table for detailed purchase tracking
CREATE TABLE IF NOT EXISTS credit_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  credits_amount INTEGER NOT NULL,
  price_paid INTEGER NOT NULL, -- in cents
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50), -- 'stripe', 'manual', etc.
  stripe_payment_intent_id VARCHAR(255),
  stripe_invoice_id VARCHAR(255),
  purchase_type VARCHAR(50) NOT NULL CHECK (purchase_type IN ('subscription', 'one_time', 'bonus', 'manual')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  rollover_expires_at TIMESTAMP WITH TIME ZONE, -- 2 months after expires_at
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_credit_purchases_user_id ON credit_purchases(user_id);
CREATE INDEX idx_credit_purchases_expires_at ON credit_purchases(expires_at);
CREATE INDEX idx_credit_purchases_created_at ON credit_purchases(created_at);

-- RLS policies
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases" ON credit_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage purchases" ON credit_purchases
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to add credit purchase with automatic expiration
CREATE OR REPLACE FUNCTION add_credit_purchase(
  p_user_id UUID,
  p_credits_amount INTEGER,
  p_price_paid INTEGER,
  p_purchase_type VARCHAR(50),
  p_payment_method VARCHAR(50) DEFAULT 'stripe',
  p_stripe_payment_intent_id VARCHAR(255) DEFAULT NULL,
  p_stripe_invoice_id VARCHAR(255) DEFAULT NULL
) RETURNS credit_purchases AS $$
DECLARE
  v_purchase credit_purchases;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_rollover_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate expiration dates based on purchase type
  IF p_purchase_type = 'subscription' THEN
    -- Subscription credits expire at next billing period (30 days)
    v_expires_at := NOW() + INTERVAL '30 days';
    v_rollover_expires_at := NULL; -- No rollover for subscription credits
  ELSIF p_purchase_type = 'one_time' THEN
    -- Pay-as-you-go credits expire after 1 year
    v_expires_at := NOW() + INTERVAL '1 year';
    -- With 2-month rollover period
    v_rollover_expires_at := v_expires_at + INTERVAL '2 months';
  ELSE
    -- Bonus/manual credits - 1 year default
    v_expires_at := NOW() + INTERVAL '1 year';
    v_rollover_expires_at := v_expires_at + INTERVAL '2 months';
  END IF;

  -- Insert purchase record
  INSERT INTO credit_purchases (
    user_id, credits_amount, price_paid, purchase_type, payment_method,
    stripe_payment_intent_id, stripe_invoice_id, expires_at, 
    rollover_expires_at, credits_remaining
  ) VALUES (
    p_user_id, p_credits_amount, p_price_paid, p_purchase_type, p_payment_method,
    p_stripe_payment_intent_id, p_stripe_invoice_id, v_expires_at,
    v_rollover_expires_at, p_credits_amount
  ) RETURNING * INTO v_purchase;

  -- Add credits to user profile
  UPDATE profiles
  SET credits_remaining = credits_remaining + p_credits_amount
  WHERE id = p_user_id;

  -- Log transaction
  INSERT INTO credit_transactions (
    user_id, amount, type, description, balance_after, metadata
  ) VALUES (
    p_user_id, 
    p_credits_amount, 
    'purchase',
    format('%s credit purchase - %s', p_purchase_type, p_credits_amount),
    (SELECT credits_remaining FROM profiles WHERE id = p_user_id),
    jsonb_build_object(
      'purchase_id', v_purchase.id,
      'purchase_type', p_purchase_type,
      'expires_at', v_expires_at
    )
  );

  RETURN v_purchase;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to use credits with FIFO (First In, First Out) logic
CREATE OR REPLACE FUNCTION use_credits_with_expiration(
  p_user_id UUID,
  p_credits_to_use INTEGER,
  p_operation VARCHAR(255)
) RETURNS TABLE (
  success BOOLEAN,
  credits_used INTEGER,
  remaining_balance INTEGER
) AS $$
DECLARE
  v_credits_needed INTEGER;
  v_purchase RECORD;
  v_credits_deducted INTEGER;
  v_total_available INTEGER;
BEGIN
  v_credits_needed := p_credits_to_use;
  v_credits_deducted := 0;

  -- Check total available credits
  SELECT credits_remaining INTO v_total_available
  FROM profiles WHERE id = p_user_id;

  IF v_total_available < p_credits_to_use THEN
    RETURN QUERY SELECT FALSE, 0, v_total_available;
    RETURN;
  END IF;

  -- Deduct credits from purchases in FIFO order (oldest first)
  FOR v_purchase IN
    SELECT id, credits_remaining, expires_at, rollover_expires_at
    FROM credit_purchases
    WHERE user_id = p_user_id
      AND credits_remaining > 0
      AND (
        expires_at > NOW() OR 
        (rollover_expires_at IS NOT NULL AND rollover_expires_at > NOW())
      )
    ORDER BY created_at ASC
    FOR UPDATE
  LOOP
    IF v_credits_needed <= 0 THEN
      EXIT;
    END IF;

    -- Determine how many credits to take from this purchase
    v_credits_deducted := LEAST(v_purchase.credits_remaining, v_credits_needed);

    -- Update the purchase record
    UPDATE credit_purchases
    SET credits_remaining = credits_remaining - v_credits_deducted
    WHERE id = v_purchase.id;

    v_credits_needed := v_credits_needed - v_credits_deducted;
  END LOOP;

  -- Update user's total balance
  UPDATE profiles
  SET credits_remaining = credits_remaining - p_credits_to_use
  WHERE id = p_user_id;

  -- Log the usage transaction
  INSERT INTO credit_transactions (
    user_id, amount, type, description, balance_after
  ) VALUES (
    p_user_id,
    p_credits_to_use,
    'usage',
    p_operation,
    (SELECT credits_remaining FROM profiles WHERE id = p_user_id)
  );

  RETURN QUERY SELECT 
    TRUE, 
    p_credits_to_use,
    (SELECT credits_remaining FROM profiles WHERE id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired credits
CREATE OR REPLACE FUNCTION cleanup_expired_credits()
RETURNS TABLE (
  user_id UUID,
  credits_expired INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH expired_credits AS (
    UPDATE credit_purchases cp
    SET credits_remaining = 0
    WHERE credits_remaining > 0
      AND rollover_expires_at < NOW()
    RETURNING cp.user_id, cp.credits_remaining as expired_amount
  ),
  grouped_expired AS (
    SELECT ec.user_id, SUM(ec.expired_amount) as total_expired
    FROM expired_credits ec
    GROUP BY ec.user_id
  )
  -- Update user balances and log expirations
  UPDATE profiles p
  SET credits_remaining = GREATEST(0, p.credits_remaining - ge.total_expired)
  FROM grouped_expired ge
  WHERE p.id = ge.user_id
  RETURNING p.id, ge.total_expired;

  -- Log expiration transactions
  INSERT INTO credit_transactions (user_id, amount, type, description, balance_after)
  SELECT 
    r.user_id,
    r.credits_expired,
    'usage',
    'Credits expired',
    (SELECT credits_remaining FROM profiles WHERE id = r.user_id)
  FROM cleanup_expired_credits() r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for user's credit summary with expiration info
CREATE OR REPLACE VIEW user_credit_summary AS
SELECT 
  p.id as user_id,
  p.credits_remaining as total_credits,
  COALESCE(SUM(
    CASE 
      WHEN cp.expires_at > NOW() AND cp.credits_remaining > 0 
      THEN cp.credits_remaining 
      ELSE 0 
    END
  ), 0) as active_credits,
  COALESCE(SUM(
    CASE 
      WHEN cp.expires_at <= NOW() 
        AND cp.rollover_expires_at > NOW() 
        AND cp.credits_remaining > 0
      THEN cp.credits_remaining 
      ELSE 0 
    END
  ), 0) as rollover_credits,
  MIN(
    CASE 
      WHEN cp.credits_remaining > 0 AND cp.expires_at > NOW()
      THEN cp.expires_at 
      ELSE NULL 
    END
  ) as next_expiration_date,
  COUNT(DISTINCT cp.id) FILTER (WHERE cp.credits_remaining > 0) as active_purchases
FROM profiles p
LEFT JOIN credit_purchases cp ON p.id = cp.user_id
GROUP BY p.id, p.credits_remaining;

-- Grant permissions
GRANT SELECT ON user_credit_summary TO authenticated;
GRANT EXECUTE ON FUNCTION add_credit_purchase TO service_role;
GRANT EXECUTE ON FUNCTION use_credits_with_expiration TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_credits TO service_role;