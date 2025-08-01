-- Create credit deduction function with expiration tracking
CREATE OR REPLACE FUNCTION use_credits_with_expiration(
    p_user_id UUID,
    p_credits_to_use INTEGER,
    p_operation TEXT
)
RETURNS TABLE(success BOOLEAN, remaining_credits INTEGER) AS $$
DECLARE
    v_current_credits INTEGER;
    v_new_credits INTEGER;
BEGIN
    -- Get current credits
    SELECT credits_remaining INTO v_current_credits
    FROM profiles
    WHERE id = p_user_id;
    
    -- Check if enough credits
    IF v_current_credits < p_credits_to_use THEN
        RETURN QUERY SELECT false, v_current_credits;
        RETURN;
    END IF;
    
    -- Deduct credits
    v_new_credits := v_current_credits - p_credits_to_use;
    
    UPDATE profiles
    SET credits_remaining = v_new_credits,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log the transaction
    INSERT INTO credit_transactions (
        user_id,
        amount,
        type,
        description,
        metadata,
        balance_after
    ) VALUES (
        p_user_id,
        -p_credits_to_use,
        'usage',
        'Used for ' || p_operation,
        jsonb_build_object('operation', p_operation),
        v_new_credits
    );
    
    RETURN QUERY SELECT true, v_new_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create credit transaction function for refunds
CREATE OR REPLACE FUNCTION add_credit_transaction(
    p_user_id UUID,
    p_amount INTEGER,
    p_type VARCHAR(50),
    p_description TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
DECLARE
    v_current_credits INTEGER;
    v_new_credits INTEGER;
BEGIN
    -- Get current credits
    SELECT credits_remaining INTO v_current_credits
    FROM profiles
    WHERE id = p_user_id;
    
    -- Calculate new credits
    v_new_credits := v_current_credits + p_amount;
    
    -- Update profile
    UPDATE profiles
    SET credits_remaining = v_new_credits,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log the transaction
    INSERT INTO credit_transactions (
        user_id,
        amount,
        type,
        description,
        metadata,
        balance_after
    ) VALUES (
        p_user_id,
        p_amount,
        p_type,
        p_description,
        p_metadata,
        v_new_credits
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION use_credits_with_expiration TO authenticated;
GRANT EXECUTE ON FUNCTION add_credit_transaction TO authenticated;