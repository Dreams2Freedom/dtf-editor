-- Migration: Atomic Credit Deduction Function
-- Purpose: Prevent race conditions in credit deduction during image generation
-- Date: 2025-01-05

-- Create function for atomic credit deduction
-- This function deducts credits in a single atomic operation
-- Returns the new credit balance if successful, NULL if insufficient credits
CREATE OR REPLACE FUNCTION deduct_credits_atomic(
  p_user_id UUID,
  p_amount INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Atomically update credits_remaining only if user has enough
  -- Use FOR UPDATE to lock the row and prevent race conditions
  UPDATE profiles
  SET credits_remaining = credits_remaining - p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
    AND credits_remaining >= p_amount
  RETURNING credits_remaining INTO v_new_balance;

  -- If no row was updated (insufficient credits), return NULL
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION deduct_credits_atomic(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_credits_atomic(UUID, INTEGER) TO service_role;

-- Create function for refunding credits (for failed generations)
CREATE OR REPLACE FUNCTION refund_credits_atomic(
  p_user_id UUID,
  p_amount INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Atomically add credits_remaining back
  UPDATE profiles
  SET credits_remaining = credits_remaining + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING credits_remaining INTO v_new_balance;

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION refund_credits_atomic(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION refund_credits_atomic(UUID, INTEGER) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION deduct_credits_atomic IS 'Atomically deduct credits from user profile (credits_remaining column). Returns new balance on success, NULL if insufficient credits. Prevents race conditions.';
COMMENT ON FUNCTION refund_credits_atomic IS 'Atomically refund credits to user profile (credits_remaining column). Used when image generation fails after credit deduction.';
