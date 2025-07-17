-- Fix user credits to reasonable values
UPDATE users 
SET credits_remaining = 2,
    credits_used = 0,
    total_credits_purchased = 2
WHERE email = 'admin@dtfeditor.com';

-- Also fix any other users with unreasonable credit values
UPDATE users 
SET credits_remaining = 2,
    credits_used = 0,
    total_credits_purchased = 2
WHERE credits_remaining > 1000 OR credits_used > 1000; 