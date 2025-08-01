-- Force clear all discount usage for testing
UPDATE profiles
SET 
    discount_used_count = 0,
    last_discount_date = NULL
WHERE email = 'snsmarketing@gmail.com';

-- Also delete ALL discount events for this user
DELETE FROM subscription_events
WHERE user_id = (SELECT id FROM profiles WHERE email = 'snsmarketing@gmail.com')
AND event_type IN ('discount_offered', 'discount_used');

-- Force clear pause data too to allow testing both features
UPDATE profiles
SET 
    pause_count = 0,
    last_pause_date = NULL,
    subscription_paused_until = NULL
WHERE email = 'snsmarketing@gmail.com';

-- Delete pause events from today
DELETE FROM subscription_events
WHERE user_id = (SELECT id FROM profiles WHERE email = 'snsmarketing@gmail.com')
AND event_type = 'subscription_paused'
AND created_at >= CURRENT_DATE;