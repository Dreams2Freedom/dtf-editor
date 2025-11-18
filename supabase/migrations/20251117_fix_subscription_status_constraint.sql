-- Fix subscription_status constraint to include 'professional' and 'active'
-- This fixes the bug where users can't upgrade to professional plan

-- Drop the old constraint
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

-- Add new constraint with all valid values including 'professional' and 'active'
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_subscription_status_check
CHECK (subscription_status IN (
  'free',           -- Free plan
  'basic',          -- Basic subscription
  'starter',        -- Starter subscription
  'professional',   -- Professional subscription (ADDED)
  'active',         -- Active Stripe status (ADDED)
  'past_due',       -- Payment failed
  'canceled',       -- Subscription canceled
  'cancelled',      -- Alt spelling for canceled
  'trialing',       -- Trial period
  'incomplete',     -- Initial subscription not yet paid
  'incomplete_expired', -- Subscription expired before first payment
  'unpaid'          -- Failed to pay
));

-- Comment explaining the dual use of this column
COMMENT ON COLUMN public.profiles.subscription_status IS
'This column is used for BOTH plan names (free, basic, starter, professional) AND Stripe subscription statuses (active, canceled, past_due, etc.). This is intentional to maintain backward compatibility.';
