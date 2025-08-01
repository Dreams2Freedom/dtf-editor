-- Temporarily update eligibility functions for testing
-- This removes time-based restrictions

-- Update pause eligibility to remove waiting period
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
    
    -- REMOVED: 7-day waiting period check
    -- REMOVED: Last pause date check
    
    -- Check pause limit (keeping high limit for testing)
    IF v_pauses_this_year >= 10 THEN
        RETURN QUERY SELECT FALSE, 'You can only pause your subscription 2 times per year'::TEXT, COALESCE(v_profile.pause_count, 0);
        RETURN;
    END IF;
    
    -- User is eligible
    RETURN QUERY SELECT TRUE, 'Eligible to pause subscription'::TEXT, COALESCE(v_profile.pause_count, 0);
END;
$$;

-- Update discount eligibility to remove time restrictions
CREATE OR REPLACE FUNCTION check_discount_eligibility(p_user_id UUID)
RETURNS TABLE(can_use_discount BOOLEAN, reason TEXT, discount_used_count INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
    v_profile profiles%ROWTYPE;
BEGIN
    -- Get user profile
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'User not found'::TEXT, 0;
        RETURN;
    END IF;
    
    -- REMOVED: 60-day membership requirement
    -- REMOVED: 180-day waiting period between discounts
    
    -- User is eligible (no restrictions for testing)
    RETURN QUERY 
    SELECT 
        TRUE, 
        'Eligible for retention discount'::TEXT,
        COALESCE(v_profile.discount_count, 0);
END;
$$;