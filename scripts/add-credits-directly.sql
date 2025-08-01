-- Add the 10 credits from the earlier purchase directly
SELECT add_user_credits(
    p_user_id := 'f689bb22-89dd-4c3c-a941-d77feb84428d'::UUID,
    p_amount := 10,
    p_transaction_type := 'purchase',
    p_description := '10 credits purchase',
    p_metadata := '{"stripe_payment_intent_id": "pi_3RqE2YPHFzf1GpIr29m1Wh1p", "price_paid": 799}'::JSONB
);

-- Check the user's new balance
SELECT id, email, credits_remaining, total_credits_purchased 
FROM profiles 
WHERE id = 'f689bb22-89dd-4c3c-a941-d77feb84428d';

-- Check the transaction was logged
SELECT * FROM credit_transactions 
WHERE user_id = 'f689bb22-89dd-4c3c-a941-d77feb84428d'
ORDER BY created_at DESC
LIMIT 5;