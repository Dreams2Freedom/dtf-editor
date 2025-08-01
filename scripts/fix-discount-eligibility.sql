-- Update discount eligibility function to allow new users (first month) to get discount
-- but enforce 6-month waiting period after first use

CREATE OR REPLACE FUNCTION check_discount_eligibility(p_user_id UUID)
RETURNS TABLE(can_use_discount BOOLEAN, reason TEXT, discount_used_count INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
    v_profile profiles%ROWTYPE;
    v_days_since_last_discount INTEGER;
    v_days_since_signup INTEGER;
BEGIN
    -- Get user profile
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'User not found'::TEXT, 0;
        RETURN;
    END IF;
    
    -- Calculate days since signup
    v_days_since_signup := EXTRACT(DAY FROM NOW() - v_profile.created_at);
    
    -- Check if user has used discount before
    IF v_profile.last_discount_date IS NOT NULL THEN
        v_days_since_last_discount := EXTRACT(DAY FROM NOW() - v_profile.last_discount_date);
        
        -- Enforce 6-month (180 days) waiting period after using discount
        IF v_days_since_last_discount < 180 THEN
            RETURN QUERY 
            SELECT 
                FALSE, 
                'You can use a retention discount once every 6 months. Next eligible in ' || 
                (180 - v_days_since_last_discount) || ' days'::TEXT,
                COALESCE(v_profile.discount_count, 0);
            RETURN;
        END IF;
    ELSE
        -- First-time discount users
        -- Allow discount in first 30 days OR after 60 days
        IF v_days_since_signup > 30 AND v_days_since_signup < 60 THEN
            RETURN QUERY 
            SELECT 
                FALSE, 
                'Retention discounts are available in your first month or after 60 days of membership'::TEXT,
                COALESCE(v_profile.discount_count, 0);
            RETURN;
        END IF;
    END IF;
    
    -- User is eligible
    RETURN QUERY 
    SELECT 
        TRUE, 
        'Eligible for retention discount'::TEXT,
        COALESCE(v_profile.discount_count, 0);
END;
$$;