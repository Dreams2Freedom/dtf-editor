-- Function to adjust user credits (for plan changes, refunds, etc)
CREATE OR REPLACE FUNCTION adjust_user_credits(
  p_user_id UUID,
  p_adjustment INTEGER,
  p_operation TEXT,
  p_description TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_credits INTEGER;
  v_new_credits INTEGER;
  v_result JSON;
BEGIN
  -- Get current credits
  SELECT credits INTO v_current_credits
  FROM profiles
  WHERE id = p_user_id;

  IF v_current_credits IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Calculate new credits (ensure non-negative)
  v_new_credits := GREATEST(0, v_current_credits + p_adjustment);

  -- Update credits
  UPDATE profiles
  SET 
    credits = v_new_credits,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Log the transaction
  INSERT INTO credit_transactions (
    user_id,
    amount,
    operation,
    description,
    created_at
  ) VALUES (
    p_user_id,
    ABS(p_adjustment),
    p_operation,
    COALESCE(p_description, 
      CASE 
        WHEN p_adjustment > 0 THEN 'Credit adjustment: added'
        ELSE 'Credit adjustment: removed'
      END
    ),
    NOW()
  );

  -- Return result
  v_result := json_build_object(
    'success', true,
    'previous_credits', v_current_credits,
    'adjustment', p_adjustment,
    'new_credits', v_new_credits,
    'operation', p_operation
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION adjust_user_credits TO authenticated;
GRANT EXECUTE ON FUNCTION adjust_user_credits TO service_role;