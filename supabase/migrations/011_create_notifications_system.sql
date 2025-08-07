-- Migration: Create Notifications System
-- Description: Sets up notification system for admin-to-user communications

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'success', 'error', 'announcement')),
  
  -- Targeting
  target_audience TEXT NOT NULL CHECK (target_audience IN ('all', 'free', 'basic', 'starter', 'custom')),
  target_user_ids UUID[] DEFAULT '{}', -- For specific users if needed
  
  -- Metadata
  action_url TEXT, -- Optional URL for CTA
  action_text TEXT, -- Optional CTA button text
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ, -- Optional expiration
  
  -- Status
  is_active BOOLEAN DEFAULT true
);

-- Create user_notifications junction table for read status
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  is_dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(notification_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_notifications_target ON notifications(target_audience);
CREATE INDEX idx_notifications_active ON notifications(is_active, expires_at);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

CREATE INDEX idx_user_notifications_user ON user_notifications(user_id, is_read, is_dismissed);
CREATE INDEX idx_user_notifications_notification ON user_notifications(notification_id);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications table
-- Admins can create/update/delete notifications
CREATE POLICY "Admins can manage notifications" ON notifications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- All authenticated users can view active notifications
CREATE POLICY "Users can view active notifications" ON notifications
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  );

-- RLS Policies for user_notifications table
-- Users can only see their own notification status
CREATE POLICY "Users can view own notification status" ON user_notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notification status
CREATE POLICY "Users can update own notification status" ON user_notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- System can insert notification status for users
CREATE POLICY "System can create notification status" ON user_notifications
  FOR INSERT
  WITH CHECK (true);

-- Function to get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)
  FROM user_notifications un
  JOIN notifications n ON n.id = un.notification_id
  WHERE un.user_id = p_user_id
  AND un.is_read = false
  AND un.is_dismissed = false
  AND n.is_active = true
  AND (n.expires_at IS NULL OR n.expires_at > NOW());
$$;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID, p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_notifications
  SET is_read = true, read_at = NOW()
  WHERE notification_id = p_notification_id
  AND user_id = p_user_id
  AND is_read = false;
END;
$$;

-- Function to dismiss notification
CREATE OR REPLACE FUNCTION dismiss_notification(p_notification_id UUID, p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_notifications
  SET is_dismissed = true, dismissed_at = NOW()
  WHERE notification_id = p_notification_id
  AND user_id = p_user_id
  AND is_dismissed = false;
END;
$$;

-- Function to send notification to target audience
CREATE OR REPLACE FUNCTION send_notification_to_audience(p_notification_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_target_audience TEXT;
  v_target_user_ids UUID[];
  v_user_count INTEGER := 0;
BEGIN
  -- Get notification details
  SELECT target_audience, target_user_ids
  INTO v_target_audience, v_target_user_ids
  FROM notifications
  WHERE id = p_notification_id;

  -- If custom target with specific user IDs
  IF v_target_audience = 'custom' AND array_length(v_target_user_ids, 1) > 0 THEN
    INSERT INTO user_notifications (notification_id, user_id)
    SELECT p_notification_id, unnest(v_target_user_ids)
    ON CONFLICT (notification_id, user_id) DO NOTHING;
    
    GET DIAGNOSTICS v_user_count = ROW_COUNT;
    RETURN v_user_count;
  END IF;

  -- For audience-based targeting
  INSERT INTO user_notifications (notification_id, user_id)
  SELECT p_notification_id, p.id
  FROM profiles p
  WHERE 
    CASE 
      WHEN v_target_audience = 'all' THEN true
      WHEN v_target_audience = 'free' THEN 
        (p.subscription_plan IS NULL OR p.subscription_plan = 'free')
      WHEN v_target_audience = 'basic' THEN 
        p.subscription_plan = 'basic'
      WHEN v_target_audience = 'starter' THEN 
        p.subscription_plan = 'starter'
      ELSE false
    END
  ON CONFLICT (notification_id, user_id) DO NOTHING;

  GET DIAGNOSTICS v_user_count = ROW_COUNT;
  RETURN v_user_count;
END;
$$;

-- View for notifications with read status for current user
CREATE OR REPLACE VIEW user_notifications_view AS
SELECT 
  n.*,
  un.is_read,
  un.read_at,
  un.is_dismissed,
  un.dismissed_at,
  p.email as created_by_email,
  p.first_name || ' ' || p.last_name as created_by_name
FROM notifications n
LEFT JOIN user_notifications un ON n.id = un.notification_id AND un.user_id = auth.uid()
LEFT JOIN profiles p ON n.created_by = p.id
WHERE 
  n.is_active = true
  AND (n.expires_at IS NULL OR n.expires_at > NOW())
  AND (
    -- Show to all users
    n.target_audience = 'all'
    -- Or show to specific subscription plans
    OR (n.target_audience = 'free' AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (subscription_plan IS NULL OR subscription_plan = 'free')
    ))
    OR (n.target_audience = 'basic' AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND subscription_plan = 'basic'
    ))
    OR (n.target_audience = 'starter' AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND subscription_plan = 'starter'
    ))
    -- Or show to specific users
    OR (n.target_audience = 'custom' AND auth.uid() = ANY(n.target_user_ids))
  );

-- Grant permissions
GRANT SELECT ON user_notifications_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION dismiss_notification TO authenticated;
GRANT EXECUTE ON FUNCTION send_notification_to_audience TO authenticated;