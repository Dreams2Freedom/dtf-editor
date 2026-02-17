-- NEW-18: Atomic bulk credit operations via RPC
-- Prevents lost-update race conditions in the read-compute-write pattern.

-- Atomic ADD: increments credits for multiple users in a single statement
CREATE OR REPLACE FUNCTION add_credits_bulk(
  p_user_ids UUID[],
  p_amount INTEGER,
  p_admin_id UUID,
  p_description TEXT DEFAULT 'Admin bulk credit addition'
)
RETURNS TABLE(user_id UUID, new_credits INTEGER) AS $$
BEGIN
  -- Atomically increment credits, capped at 1000
  RETURN QUERY
  UPDATE profiles
  SET
    credits_remaining = LEAST(credits_remaining + p_amount, 1000),
    updated_at = NOW()
  WHERE id = ANY(p_user_ids)
  RETURNING profiles.id AS user_id, profiles.credits_remaining AS new_credits;

  -- Log credit transactions for each affected user
  INSERT INTO credit_transactions (user_id, amount, type, description, created_at)
  SELECT unnest(p_user_ids), p_amount, 'admin_adjustment', p_description, NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic SET: sets credits for multiple users in a single statement
CREATE OR REPLACE FUNCTION set_credits_bulk(
  p_user_ids UUID[],
  p_amount INTEGER,
  p_admin_id UUID,
  p_description TEXT DEFAULT 'Admin bulk credit set'
)
RETURNS TABLE(user_id UUID, new_credits INTEGER) AS $$
BEGIN
  RETURN QUERY
  UPDATE profiles
  SET
    credits_remaining = p_amount,
    updated_at = NOW()
  WHERE id = ANY(p_user_ids)
  RETURNING profiles.id AS user_id, profiles.credits_remaining AS new_credits;

  -- Log credit transactions
  INSERT INTO credit_transactions (user_id, amount, type, description, created_at)
  SELECT unnest(p_user_ids), p_amount, 'admin_adjustment', p_description, NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
