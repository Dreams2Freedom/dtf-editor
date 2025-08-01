-- Add missing Stripe-related columns to profiles table if they don't exist

-- Subscription tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_canceled_at TIMESTAMP WITH TIME ZONE;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id ON profiles(stripe_subscription_id);

-- Comment for clarity
COMMENT ON COLUMN profiles.stripe_subscription_id IS 'Stripe subscription ID for the user';
COMMENT ON COLUMN profiles.subscription_current_period_end IS 'When the current subscription period ends';
COMMENT ON COLUMN profiles.subscription_canceled_at IS 'When the subscription was canceled (if applicable)';