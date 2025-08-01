-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS use_credits_with_expiration;
DROP FUNCTION IF EXISTS add_credit_transaction;

-- Create simplified credit deduction function
CREATE OR REPLACE FUNCTION deduct_credits(
    user_id UUID,
    credits INTEGER,
    operation TEXT
)
RETURNS JSON AS $$
DECLARE
    v_current_credits INTEGER;
    v_new_credits INTEGER;
BEGIN
    -- Get current credits
    SELECT credits_remaining INTO v_current_credits
    FROM profiles
    WHERE id = user_id;
    
    -- Check if enough credits
    IF v_current_credits IS NULL OR v_current_credits < credits THEN
        RETURN json_build_object('success', false, 'remaining_credits', COALESCE(v_current_credits, 0));
    END IF;
    
    -- Deduct credits
    v_new_credits := v_current_credits - credits;
    
    UPDATE profiles
    SET credits_remaining = v_new_credits,
        updated_at = NOW()
    WHERE id = user_id;
    
    -- Log the transaction
    INSERT INTO credit_transactions (
        user_id,
        amount,
        type,
        description,
        metadata,
        balance_after
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

-- Create simplified refund function
CREATE OR REPLACE FUNCTION refund_credits(
    user_id UUID,
    credits INTEGER,
    reason TEXT
)
RETURNS VOID AS $$
DECLARE
    v_current_credits INTEGER;
    v_new_credits INTEGER;
BEGIN
    -- Get current credits
    SELECT credits_remaining INTO v_current_credits
    FROM profiles
    WHERE id = user_id;
    
    -- Calculate new credits
    v_new_credits := COALESCE(v_current_credits, 0) + credits;
    
    -- Update profile
    UPDATE profiles
    SET credits_remaining = v_new_credits,
        updated_at = NOW()
    WHERE id = user_id;
    
    -- Log the transaction
    INSERT INTO credit_transactions (
        user_id,
        amount,
        type,
        description,
        metadata,
        balance_after
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION deduct_credits TO authenticated;
GRANT EXECUTE ON FUNCTION refund_credits TO authenticated;