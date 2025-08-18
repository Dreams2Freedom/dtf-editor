-- Create email_notifications table to track sent notifications
-- This prevents duplicate emails and provides audit trail

CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type VARCHAR(255) NOT NULL,
  email_sent_to VARCHAR(255) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index for quick lookups
  INDEX idx_email_notifications_user_type (user_id, notification_type),
  INDEX idx_email_notifications_created (created_at)
);

-- Enable RLS
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy
CREATE POLICY "Admin full access to email notifications"
  ON email_notifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Users can view their own notification history
CREATE POLICY "Users can view own email notifications"
  ON email_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Comment the table
COMMENT ON TABLE email_notifications IS 'Tracks all system-generated email notifications to prevent duplicates and provide audit trail';
COMMENT ON COLUMN email_notifications.notification_type IS 'Type of notification (e.g., credit_expiry_30, monthly_summary, etc.)';
COMMENT ON COLUMN email_notifications.metadata IS 'Additional data about the notification (urgency, amounts, etc.)';