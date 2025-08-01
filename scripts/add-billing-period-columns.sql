-- Add columns to track Stripe billing periods
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS stripe_current_period_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stripe_current_period_end TIMESTAMP WITH TIME ZONE;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_billing_period 
ON profiles(stripe_current_period_end) 
WHERE subscription_status = 'active';