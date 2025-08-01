-- Drop existing functions
DROP FUNCTION IF EXISTS check_discount_eligibility(uuid);
DROP FUNCTION IF EXISTS check_pause_eligibility(uuid);

-- Create updated discount eligibility function with correct field names
CREATE OR REPLACE FUNCTION check_discount_eligibility(p_user_id UUID)
RETURNS TABLE(can_use_discount BOOLEAN, reason TEXT, discount_used_count INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
    v_profile profiles%ROWTYPE;
    v_days_since_last_discount INTEGER;
BEGIN
    -- Get user profile
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'User not found'::TEXT, 0;
        RETURN;
    END IF;
    
    -- Check if user has EVER used a discount
    IF v_profile.last_discount_date IS NOT NULL THEN
        -- They've used a discount before, so check the waiting period
        v_days_since_last_discount := EXTRACT(DAY FROM NOW() - v_profile.last_discount_date);
        
        -- Enforce 6-month (180 days) waiting period after using discount
        IF v_days_since_last_discount < 180 THEN
            RETURN QUERY 
            SELECT 
                FALSE, 
                'You can use a retention discount once every 6 months. Next eligible in ' || 
                (180 - v_days_since_last_discount) || ' days'::TEXT,
                COALESCE(v_profile.discount_used_count, 0);
            RETURN;
        END IF;
    END IF;
    
    -- If we get here, they're eligible!
    RETURN QUERY 
    SELECT 
        TRUE, 
        'Eligible for retention discount'::TEXT,
        COALESCE(v_profile.discount_used_count, 0);
END;
$$;

-- Create updated pause eligibility function
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
    
    -- Check pause limit
    IF v_pauses_this_year >= 2 THEN
        RETURN QUERY SELECT FALSE, 'You can only pause your subscription 2 times per year'::TEXT, COALESCE(v_profile.pause_count, 0);
        RETURN;
    END IF;
    
    -- User is eligible
    RETURN QUERY SELECT TRUE, 'Eligible to pause subscription'::TEXT, COALESCE(v_profile.pause_count, 0);
END;
$$;