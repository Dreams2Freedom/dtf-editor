-- First check the table structure
SELECT column_name FROM information_schema.columns WHERE table_name = 'credit_transactions';

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS get_user_credit_transactions(uuid, integer);

-- Create RPC function with correct column names
CREATE OR REPLACE FUNCTION get_user_credit_transactions(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  type TEXT,  -- Changed from transaction_type to type
  amount INTEGER,
  balance_before INTEGER,
  balance_after INTEGER,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ct.id,
    ct.user_id,
    ct.type,  -- Changed from ct.transaction_type to ct.type
    ct.amount,
    ct.balance_before,
    ct.balance_after,
    ct.description,
    ct.metadata,
    ct.created_at
  FROM credit_transactions ct
  WHERE ct.user_id = p_user_id
  ORDER BY ct.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_credit_transactions TO authenticated;

-- Test the function
SELECT * FROM get_user_credit_transactions('f689bb22-89dd-4c3c-a941-d77feb84428d', 5);