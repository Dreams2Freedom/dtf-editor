-- Temporarily update the check_discount_eligibility function to allow testing
-- This removes the 60-day requirement for testing purposes

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
        
        -- UPDATED: Changed from 180 days to 1 day for testing
        IF v_days_since_last_discount < 1 THEN
            RETURN QUERY 
            SELECT 
                FALSE, 
                'You can use a retention discount once every 6 months. Next eligible in ' || 
                (1 - v_days_since_last_discount) || ' days'::TEXT,
                COALESCE(v_profile.discount_count, 0);
            RETURN;
        END IF;
    END IF;
    
    -- UPDATED: Changed from 60 days to 0 days for testing
    IF v_days_since_signup < 0 THEN
        RETURN QUERY 
        SELECT 
            FALSE, 
            'Retention discounts are available after 60 days of membership'::TEXT,
            COALESCE(v_profile.discount_count, 0);
        RETURN;
    END IF;
    
    -- User is eligible
    RETURN QUERY 
    SELECT 
        TRUE, 
        'Eligible for retention discount'::TEXT,
        COALESCE(v_profile.discount_count, 0);
END;
$$;

-- Also update the pause eligibility to allow testing
CREATE OR REPLACE FUNCTION check_pause_eligibility(p_user_id UUID)
RETURNS TABLE(can_pause BOOLEAN, reason TEXT, pause_count INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
    v_profile profiles%ROWTYPE;
    v_current_year INTEGER;
    v_pauses_this_year INTEGER;
BEGIN
    -- Get user profile
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'User not found'::TEXT, 0;
        RETURN;
    END IF;
    
    -- Get current year
    v_current_year := EXTRACT(YEAR FROM NOW());
    
    -- Count pauses this year from events
    SELECT COUNT(*) INTO v_pauses_this_year
    FROM subscription_events
    WHERE user_id = p_user_id
    AND event_type = 'subscription_paused'
    AND EXTRACT(YEAR FROM created_at) = v_current_year;
    
    -- Check if already paused
    IF v_profile.subscription_paused_until IS NOT NULL AND v_profile.subscription_paused_until > NOW() THEN
        RETURN QUERY SELECT FALSE, 'Subscription is already paused'::TEXT, COALESCE(v_profile.pause_count, 0);
        RETURN;
    END IF;
    
    -- UPDATED: Changed from 2 to 10 for testing
    IF v_pauses_this_year >= 10 THEN
        RETURN QUERY SELECT FALSE, 'You can only pause your subscription 2 times per year'::TEXT, COALESCE(v_profile.pause_count, 0);
        RETURN;
    END IF;
    
    -- User is eligible
    RETURN QUERY SELECT TRUE, 'Eligible to pause subscription'::TEXT, COALESCE(v_profile.pause_count, 0);
END;
$$;