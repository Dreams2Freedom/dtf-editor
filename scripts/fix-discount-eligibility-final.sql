-- Update discount eligibility function
-- Rules:
-- 1. First-time cancellers ALWAYS get the discount offer (no matter how long they've been a member)
-- 2. After using the discount once, must wait 6 months before getting it again

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
                COALESCE(v_profile.discount_count, 0);
            RETURN;
        END IF;
    END IF;
    
    -- If we get here, either:
    -- 1. They've never used a discount (first-time canceller)
    -- 2. They've used one but it's been more than 6 months
    -- Either way, they're eligible!
    
    RETURN QUERY 
    SELECT 
        TRUE, 
        'Eligible for retention discount'::TEXT,
        COALESCE(v_profile.discount_count, 0);
END;
$$;