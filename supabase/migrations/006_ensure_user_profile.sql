-- Ensure the specific user has a profile
-- This fixes the 403 errors for the logged-in user

-- First, create the profile if it doesn't exist
INSERT INTO profiles (
    id,
    email,
    credits_remaining,
    subscription_status,
    subscription_plan,
    is_admin,
    created_at,
    updated_at
)
SELECT 
    'f689bb22-89dd-4c3c-a941-d77feb84428d',
    'snsmarketing@gmail.com',
    2,
    'free',
    'free',
    false,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = 'f689bb22-89dd-4c3c-a941-d77feb84428d'
);

-- Verify the profile exists
SELECT id, email, credits_remaining, subscription_plan 
FROM profiles 
WHERE id = 'f689bb22-89dd-4c3c-a941-d77feb84428d';