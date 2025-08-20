-- Create admin notification preferences table
CREATE TABLE IF NOT EXISTS admin_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL UNIQUE,
  is_super_admin BOOLEAN DEFAULT false,
  
  -- Notification preferences
  notify_new_signups BOOLEAN DEFAULT true,
  notify_new_subscriptions BOOLEAN DEFAULT true,
  notify_cancellations BOOLEAN DEFAULT true,
  notify_refund_requests BOOLEAN DEFAULT true,
  notify_support_tickets BOOLEAN DEFAULT true,
  notify_high_value_purchases BOOLEAN DEFAULT true, -- e.g., Pro plan or 50+ credits
  notify_failed_payments BOOLEAN DEFAULT true,
  
  -- Digest preferences
  daily_digest BOOLEAN DEFAULT false,
  weekly_digest BOOLEAN DEFAULT true,
  monthly_report BOOLEAN DEFAULT true,
  
  -- Settings
  min_purchase_value_for_notification INTEGER DEFAULT 20, -- Minimum $ amount to trigger notification
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  timezone TEXT DEFAULT 'America/New_York',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index on admin_email for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_email ON admin_notification_preferences(admin_email);

-- Insert super admin with default preferences
INSERT INTO admin_notification_preferences (
  admin_email,
  is_super_admin,
  notify_new_signups,
  notify_new_subscriptions,
  notify_cancellations,
  notify_refund_requests,
  notify_support_tickets,
  notify_high_value_purchases,
  notify_failed_payments,
  daily_digest,
  weekly_digest,
  monthly_report
) VALUES (
  'Shannon@S2Transfers.com',
  true,
  true,  -- Notify on new signups
  true,  -- Notify on new subscriptions
  true,  -- Notify on cancellations
  true,  -- Notify on refund requests
  true,  -- Notify on support tickets
  true,  -- Notify on high value purchases
  true,  -- Notify on failed payments
  false, -- No daily digest
  true,  -- Weekly digest
  true   -- Monthly report
) ON CONFLICT (admin_email) DO UPDATE SET
  is_super_admin = EXCLUDED.is_super_admin,
  updated_at = TIMEZONE('utc', NOW());

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_admin_notification_preferences_updated_at
  BEFORE UPDATE ON admin_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_notification_preferences_updated_at();

-- Create RLS policies (only super admins can read/write)
ALTER TABLE admin_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policy for super admin to manage all preferences
CREATE POLICY "Super admin can manage all notification preferences" ON admin_notification_preferences
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_notification_preferences
      WHERE admin_email = auth.jwt() ->> 'email'
      AND is_super_admin = true
    )
  );

-- Policy for regular admins to manage their own preferences
CREATE POLICY "Admins can manage their own notification preferences" ON admin_notification_preferences
  FOR ALL
  USING (admin_email = auth.jwt() ->> 'email')
  WITH CHECK (admin_email = auth.jwt() ->> 'email' AND is_super_admin = false);

-- Grant permissions
GRANT ALL ON admin_notification_preferences TO authenticated;
GRANT ALL ON admin_notification_preferences TO service_role;