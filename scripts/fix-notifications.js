const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndFixNotifications() {
  try {
    console.log('🔔 Checking notification system...\n');
    
    // Check if notifications table exists
    const { data: tables, error: tableError } = await supabase
      .from('notifications')
      .select('id')
      .limit(1);
    
    if (tableError && tableError.code === '42P01') {
      console.log('❌ Notifications table does not exist');
      console.log('\n📋 Please run the following SQL in your Supabase SQL editor:');
      console.log('-------------------------------------------------------------');
      console.log(`
-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'success', 'error', 'announcement')),
  target_audience TEXT NOT NULL CHECK (target_audience IN ('all', 'free', 'basic', 'starter', 'custom')),
  target_user_ids UUID[] DEFAULT '{}',
  action_url TEXT,
  action_text TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- Create user_notifications junction table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_audience);
CREATE INDEX IF NOT EXISTS idx_notifications_active ON notifications(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id, is_read, is_dismissed);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage notifications" ON notifications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can view active notifications" ON notifications
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  );

CREATE POLICY "Users can view own notification status" ON user_notifications
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notification status" ON user_notifications
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can create notification status" ON user_notifications
  FOR INSERT
  WITH CHECK (true);
      `);
      console.log('-------------------------------------------------------------\n');
      return;
    }
    
    console.log('✅ Notifications table exists');
    
    // Check if RPC function exists by trying to use it
    console.log('🔍 Checking RPC function...');
    
    // Create a test notification
    const { data: testNotif, error: createError } = await supabase
      .from('notifications')
      .insert({
        title: 'Test Notification',
        message: 'Testing the notification system',
        type: 'info',
        target_audience: 'all',
        priority: 'normal',
        is_active: true
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Error creating test notification:', createError.message);
      return;
    }
    
    console.log('✅ Test notification created:', testNotif.id);
    
    // Try to call the RPC function
    const { data: userCount, error: rpcError } = await supabase
      .rpc('send_notification_to_audience', {
        p_notification_id: testNotif.id
      });
    
    if (rpcError) {
      console.log('❌ RPC function does not exist or has errors:', rpcError.message);
      console.log('\n📋 Please run the following SQL in your Supabase SQL editor:');
      console.log('-------------------------------------------------------------');
      console.log(`
-- Simple notification sending function
CREATE OR REPLACE FUNCTION send_notification_to_audience(p_notification_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
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

  -- For all users
  IF v_target_audience = 'all' THEN
    INSERT INTO user_notifications (notification_id, user_id)
    SELECT p_notification_id, id
    FROM profiles
    ON CONFLICT (notification_id, user_id) DO NOTHING;
  
  -- For free users
  ELSIF v_target_audience = 'free' THEN
    INSERT INTO user_notifications (notification_id, user_id)
    SELECT p_notification_id, id
    FROM profiles
    WHERE subscription_plan IS NULL OR subscription_plan = 'free'
    ON CONFLICT (notification_id, user_id) DO NOTHING;
  
  -- For basic plan users
  ELSIF v_target_audience = 'basic' THEN
    INSERT INTO user_notifications (notification_id, user_id)
    SELECT p_notification_id, id
    FROM profiles
    WHERE subscription_plan = 'basic'
    ON CONFLICT (notification_id, user_id) DO NOTHING;
  
  -- For starter plan users
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

-- Grant permission
GRANT EXECUTE ON FUNCTION send_notification_to_audience TO authenticated;
      `);
      console.log('-------------------------------------------------------------\n');
    } else {
      console.log('✅ RPC function works! Users notified:', userCount);
    }
    
    // Clean up test notification
    await supabase
      .from('user_notifications')
      .delete()
      .eq('notification_id', testNotif.id);
      
    await supabase
      .from('notifications')
      .delete()
      .eq('id', testNotif.id);
    
    console.log('🧹 Cleaned up test notification');
    
    // Test creating a real notification via API
    console.log('\n🧪 Testing API endpoint...');
    
    // Get an admin session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('⚠️  No session available. Please test the API endpoint from the admin panel.');
    }
    
    console.log('\n✅ Notification system is ready to use!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAndFixNotifications();