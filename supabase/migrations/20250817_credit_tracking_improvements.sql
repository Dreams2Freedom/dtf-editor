-- Add last_credit_reset column to profiles for tracking renewal dates
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_credit_reset TIMESTAMPTZ DEFAULT NOW();

-- Add expires_at column to credit_transactions for credit expiration tracking
ALTER TABLE public.credit_transactions 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Update the subscription_status check constraint to allow 'past_due' status
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_subscription_status_check 
CHECK (subscription_status IN ('free', 'basic', 'starter', 'past_due', 'canceled'));

-- Add index for faster expiration queries
CREATE INDEX IF NOT EXISTS idx_credit_transactions_expires_at 
ON public.credit_transactions(expires_at) 
WHERE expires_at IS NOT NULL;

-- Add comment for new columns
COMMENT ON COLUMN public.profiles.last_credit_reset IS 'Timestamp of last subscription renewal or credit reset';
COMMENT ON COLUMN public.credit_transactions.expires_at IS 'Optional expiration date for credits (used for rollover limits)';