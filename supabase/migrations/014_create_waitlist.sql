-- Create waitlist table for coming soon page signups
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  source TEXT DEFAULT 'coming-soon',
  referrer TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at DESC);

-- Enable RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Only service role can read waitlist (for admin purposes)
CREATE POLICY "Service role can manage waitlist" ON waitlist
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Allow public to insert their own email (no auth required)
CREATE POLICY "Anyone can join waitlist" ON waitlist
  FOR INSERT WITH CHECK (true);

-- Prevent users from reading other emails
CREATE POLICY "Users cannot read waitlist" ON waitlist
  FOR SELECT USING (false);

-- Add comment for documentation
COMMENT ON TABLE waitlist IS 'Stores email addresses for the coming soon page waitlist';

-- Grant permissions
GRANT INSERT ON waitlist TO anon;
GRANT ALL ON waitlist TO service_role;