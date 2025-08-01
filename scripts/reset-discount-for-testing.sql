-- Reset discount usage for testing
UPDATE profiles
SET 
    discount_used_count = 0,
    last_discount_date = NULL
WHERE email = 'snsmarketing@gmail.com';

-- Also delete the discount event
DELETE FROM subscription_events
WHERE user_id = (SELECT id FROM profiles WHERE email = 'snsmarketing@gmail.com')
AND event_type = 'discount_used'
AND created_at >= NOW() - INTERVAL '1 hour';