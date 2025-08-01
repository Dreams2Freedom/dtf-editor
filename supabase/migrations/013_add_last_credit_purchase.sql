-- Add column to track last credit purchase for pay-as-you-go image retention
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_credit_purchase_at TIMESTAMP WITH TIME ZONE;

-- Update the column when a credit purchase is made
CREATE OR REPLACE FUNCTION update_last_credit_purchase()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update on credit purchases (positive amounts with type 'purchase')
  IF NEW.type = 'purchase' AND NEW.amount > 0 THEN
    UPDATE profiles
    SET last_credit_purchase_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update last_credit_purchase_at
DROP TRIGGER IF EXISTS update_last_credit_purchase_trigger ON credit_transactions;
CREATE TRIGGER update_last_credit_purchase_trigger
AFTER INSERT ON credit_transactions
FOR EACH ROW
EXECUTE FUNCTION update_last_credit_purchase();

-- Add comment for documentation
COMMENT ON COLUMN profiles.last_credit_purchase_at IS 'Timestamp of last credit purchase, used for pay-as-you-go image retention policy';