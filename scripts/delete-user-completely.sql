-- Complete deletion of user shannonherod@gmail.com and all associated data
-- WARNING: This will permanently delete all data for this user

-- First, get the user ID
DO $$
DECLARE
    v_user_id UUID;
    v_stripe_customer_id TEXT;
BEGIN
    -- Get user ID
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE email = 'shannonherod@gmail.com';
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User shannonherod@gmail.com not found';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found user ID: %', v_user_id;
    
    -- Get Stripe customer ID if exists
    SELECT stripe_customer_id INTO v_stripe_customer_id
    FROM profiles
    WHERE id = v_user_id;
    
    IF v_stripe_customer_id IS NOT NULL THEN
        RAISE NOTICE 'Stripe customer ID: % (Remember to delete in Stripe Dashboard)', v_stripe_customer_id;
    END IF;
    
    -- Delete from all tables in reverse order of dependencies
    
    -- 1. Delete processed images
    DELETE FROM processed_images WHERE user_id = v_user_id;
    RAISE NOTICE 'Deleted processed images';
    
    -- 2. Delete credit transactions
    DELETE FROM credit_transactions WHERE user_id = v_user_id;
    RAISE NOTICE 'Deleted credit transactions';
    
    -- 3. Delete subscription history
    DELETE FROM subscription_history WHERE user_id = v_user_id;
    RAISE NOTICE 'Deleted subscription history';
    
    -- 4. Delete from any other custom tables (add as needed)
    -- DELETE FROM other_table WHERE user_id = v_user_id;
    
    -- 6. Delete profile (this should cascade to other tables if foreign keys are set up)
    DELETE FROM profiles WHERE id = v_user_id;
    RAISE NOTICE 'Deleted profile';
    
    -- 7. Finally, delete the auth user (this will also delete from auth.identities)
    DELETE FROM auth.users WHERE id = v_user_id;
    RAISE NOTICE 'Deleted auth user';
    
    RAISE NOTICE 'Successfully deleted all data for shannonherod@gmail.com';
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANT: Remember to also delete in Stripe Dashboard:';
    RAISE NOTICE '1. Go to https://dashboard.stripe.com/test/customers';
    RAISE NOTICE '2. Search for customer ID: %', v_stripe_customer_id;
    RAISE NOTICE '3. Delete the customer and all associated subscriptions';
    
END $$;

-- Verify deletion
SELECT 'Auth Users' as table_name, COUNT(*) as count 
FROM auth.users 
WHERE email = 'shannonherod@gmail.com'
UNION ALL
SELECT 'Profiles', COUNT(*) 
FROM profiles 
WHERE id IN (SELECT id FROM auth.users WHERE email = 'shannonherod@gmail.com')
UNION ALL
SELECT 'Processed Images', COUNT(*) 
FROM processed_images 
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'shannonherod@gmail.com')
UNION ALL
SELECT 'Credit Transactions', COUNT(*) 
FROM credit_transactions 
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'shannonherod@gmail.com');