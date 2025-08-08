-- Fix Notifications Permissions
-- Run this in Supabase SQL Editor to properly configure the notification system

-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view active notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view own notification status" ON user_notifications;
DROP POLICY IF EXISTS "Users can update own notification status" ON user_notifications;
DROP POLICY IF EXISTS "System can create notification status" ON user_notifications;

-- Disable RLS temporarily to ensure tables can be created
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_notifications DISABLE ROW LEVEL SECURITY;

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  target_audience TEXT NOT NULL DEFAULT 'all',
  target_user_ids UUID[] DEFAULT '{}',
  action_url TEXT,
  action_text TEXT,
  priority TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- Create user_notifications junction table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  is_dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(notification_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_audience);
CREATE INDEX IF NOT EXISTS idx_notifications_active ON notifications(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id, is_read, is_dismissed);
CREATE INDEX IF NOT EXISTS idx_user_notifications_notification ON user_notifications(notification_id);

-- Re-enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for notifications table
-- Allow authenticated users who are admins to do everything
CREATE POLICY "Admins can manage notifications" ON notifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Allow all authenticated users to view active notifications
CREATE POLICY "Users can view active notifications" ON notifications
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  );

-- Create permissive policies for user_notifications table
-- Users can view their own notification status
CREATE POLICY "Users can view own notification status" ON user_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own notification status
CREATE POLICY "Users can update own notification status" ON user_notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can insert notification status for any user
CREATE POLICY "Admins can create notification status" ON user_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create the RPC function for sending notifications
CREATE OR REPLACE FUNCTION send_notification_to_audience(p_notification_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_audience TEXT;
  v_user_count INTEGER := 0;
BEGIN
  -- Get notification details
  SELECT target_audience
  INTO v_target_audience
  FROM notifications
  WHERE id = p_notification_id;

  -- Insert notifications for target audience
  IF v_target_audience = 'all' THEN
    INSERT INTO user_notifications (notification_id, user_id)
    SELECT p_notification_id, id
    FROM profiles
    WHERE id IS NOT NULL
    ON CONFLICT (notification_id, user_id) DO NOTHING;
  ELSIF v_target_audience = 'free' THEN
    INSERT INTO user_notifications (notification_id, user_id)
    SELECT p_notification_id, id
    FROM profiles
    WHERE (subscription_plan IS NULL OR subscription_plan = 'free')
    ON CONFLICT (notification_id, user_id) DO NOTHING;
  ELSIF v_target_audience = 'basic' THEN
    INSERT INTO user_notifications (notification_id, user_id)
    SELECT p_notification_id, id
    FROM profiles
    WHERE subscription_plan = 'basic'
    ON CONFLICT (notification_id, user_id) DO NOTHING;
  ELSIF v_target_audience = 'starter' THEN
    INSERT INTO user_notifications (notification_id, user_id)
    SELECT p_notification_id, id
    FROM profiles
    WHERE subscription_plan = 'starter'
    ON CONFLICT (notification_id, user_id) DO NOTHING;
  END IF;

  GET DIAGNOSTICS v_user_count = ROW_COUNT;
  RETURN v_user_count;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION send_notification_to_audience TO authenticated;
GRANT EXECUTE ON FUNCTION send_notification_to_audience TO service_role;

-- Grant table permissions to service_role (for admin operations)
GRANT ALL ON notifications TO service_role;
GRANT ALL ON user_notifications TO service_role;

-- Test that admins can insert
-- You can verify by checking if your admin user can insert
SELECT 'Setup complete! Test by sending a notification from the admin panel.' as message;