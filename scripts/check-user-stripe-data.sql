-- Check Stripe-related data for shannonherod@gmail.com before deletion

-- Get user details including Stripe customer ID
SELECT 
    u.id as user_id,
    u.email,
    u.created_at as user_created,
    p.stripe_customer_id,
    p.stripe_subscription_id,
    p.subscription_status,
    p.subscription_plan,
    p.credits_remaining,
    p.total_credits_purchased,
    p.total_credits_used,
    p.subscription_current_period_end,
    p.subscription_canceled_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'shannonherod@gmail.com';

-- Check for any subscription history
SELECT 
    sh.*
FROM subscription_history sh
JOIN auth.users u ON sh.user_id = u.id
WHERE u.email = 'shannonherod@gmail.com'
ORDER BY sh.created_at DESC;

-- Check for any credit transactions
SELECT 
    ct.id,
    ct.type,
    ct.amount,
    ct.balance_after,
    ct.description,
    ct.metadata,
    ct.created_at
FROM credit_transactions ct
JOIN auth.users u ON ct.user_id = u.id
WHERE u.email = 'shannonherod@gmail.com'
ORDER BY ct.created_at DESC
LIMIT 20;

-- Check for processed images (to ensure we're deleting everything)
SELECT 
    COUNT(*) as total_images,
    MIN(created_at) as first_image,
    MAX(created_at) as last_image
FROM processed_images
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'shannonherod@gmail.com');