-- Function to reset monthly credits for all active subscriptions
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reset_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_result JSON;
  v_user RECORD;
  v_plan_credits INTEGER;
BEGIN
  -- Loop through all users with active subscriptions
  FOR v_user IN 
    SELECT p.id, p.subscription_plan, p.credits_remaining
    FROM profiles p
    WHERE p.subscription_status = 'active'
      AND p.subscription_plan != 'free'
  LOOP
    BEGIN
      -- Determine credits for the plan
      v_plan_credits := CASE v_user.subscription_plan
        WHEN 'basic' THEN 20
        WHEN 'starter' THEN 60
        ELSE 0
      END;

      -- Skip if no credits to reset
      IF v_plan_credits = 0 THEN
        CONTINUE;
      END IF;

      -- Reset user credits
      UPDATE profiles
      SET 
        credits = v_plan_credits,
        credits_remaining = v_plan_credits,
        credits_reset_at = NOW(),
        updated_at = NOW()
      WHERE id = v_user.id;

      -- Log the credit reset
      INSERT INTO credit_transactions (
        user_id,
        amount,
        operation,
        description,
        created_at
      ) VALUES (
        v_user.id,
        v_plan_credits,
        'monthly_reset',
        'Monthly credit reset for ' || v_user.subscription_plan || ' plan',
        NOW()
      );

      v_reset_count := v_reset_count + 1;

    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing other users
      v_error_count := v_error_count + 1;
      
      -- Optionally log error to a system events table
      INSERT INTO subscription_events (
        user_id,
        event_type,
        event_data,
        created_at
      ) VALUES (
        v_user.id,
        'credit_reset_error',
        json_build_object(
          'error', SQLERRM,
          'plan', v_user.subscription_plan
        ),
        NOW()
      );
    END;
  END LOOP;

  -- Return summary
  v_result := json_build_object(
    'success', v_error_count = 0,
    'reset_count', v_reset_count,
    'error_count', v_error_count,
    'timestamp', NOW()
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission to service role only (for cron jobs)
GRANT EXECUTE ON FUNCTION reset_monthly_credits TO service_role;

-- Create a function to check if credits need to be reset for a specific user
CREATE OR REPLACE FUNCTION check_credit_reset_needed(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile RECORD;
  v_needs_reset BOOLEAN := FALSE;
BEGIN
  -- Get user profile
  SELECT 
    subscription_plan,
    subscription_status,
    credits_reset_at,
    stripe_current_period_start,
    stripe_current_period_end
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  -- Check if user has active subscription
  IF v_profile.subscription_status = 'active' AND v_profile.subscription_plan != 'free' THEN
    -- Check if we're in a new billing period
    IF v_profile.stripe_current_period_start IS NOT NULL AND 
       (v_profile.credits_reset_at IS NULL OR 
        v_profile.credits_reset_at < v_profile.stripe_current_period_start) THEN
      v_needs_reset := TRUE;
    END IF;
  END IF;

  RETURN v_needs_reset;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_credit_reset_needed TO authenticated;
GRANT EXECUTE ON FUNCTION check_credit_reset_needed TO service_role;

-- Add credits_reset_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'credits_reset_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN credits_reset_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;