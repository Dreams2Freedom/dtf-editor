-- Fix Credit System Migration
-- This creates the missing credit_transactions table and updates the add_user_credits function

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS add_user_credits CASCADE;

-- Drop table if it exists (to ensure clean slate)
DROP TABLE IF EXISTS credit_transactions CASCADE;

-- Create credit_transactions table
CREATE TABLE credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    balance_after INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);

-- Enable RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "System can insert transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_user_select" ON credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_system_insert" ON credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_admin_all" ON credit_transactions;

-- Create simple RLS policies
-- Users can view their own transactions
CREATE POLICY "users_view_own_credit_transactions" ON credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "service_role_all_credit_transactions" ON credit_transactions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create the add_user_credits function
CREATE OR REPLACE FUNCTION add_user_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_transaction_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Get current balance with lock
    SELECT credits_remaining INTO v_current_balance
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;

    -- Calculate new balance
    v_new_balance := v_current_balance + p_amount;

    -- Update user credits
    UPDATE profiles 
    SET 
        credits_remaining = v_new_balance,
        total_credits_purchased = CASE 
            WHEN p_amount > 0 THEN total_credits_purchased + p_amount 
            ELSE total_credits_purchased 
        END,
        total_credits_used = CASE 
            WHEN p_amount < 0 THEN total_credits_used + ABS(p_amount)
            ELSE total_credits_used 
        END,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Log transaction
    INSERT INTO credit_transactions (
        user_id,
        amount,
        type,
        description,
        metadata,
        balance_after
    ) VALUES (
        p_user_id,
        p_amount,
        p_transaction_type,
        p_description,
        COALESCE(p_metadata, '{}'::jsonb),
        v_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_user_credits TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_credits TO service_role;

-- Add missing columns to profiles if they don't exist
DO $$ 
BEGIN
    -- Add total_credits_purchased if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' 
                   AND column_name = 'total_credits_purchased') THEN
        ALTER TABLE profiles ADD COLUMN total_credits_purchased INTEGER DEFAULT 0;
    END IF;

    -- Add total_credits_used if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' 
                   AND column_name = 'total_credits_used') THEN
        ALTER TABLE profiles ADD COLUMN total_credits_used INTEGER DEFAULT 0;
    END IF;

    -- Add last_credit_reset if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' 
                   AND column_name = 'last_credit_reset') THEN
        ALTER TABLE profiles ADD COLUMN last_credit_reset TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;