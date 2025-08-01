-- Subscription Retention Feature Database Schema
-- Run this in Supabase SQL editor

-- Add retention tracking columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_paused_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pause_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_pause_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS discount_used_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_discount_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_eligible_discount_date TIMESTAMP WITH TIME ZONE;

-- Create subscription events table for tracking
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB DEFAULT '{}',
  stripe_event_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created ON subscription_events(created_at DESC);

-- RLS policies for subscription_events
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Users can only see their own events
CREATE POLICY "Users can view own subscription events" 
ON subscription_events FOR SELECT 
USING (auth.uid() = user_id);

-- Service role can insert any events, users can insert their own
CREATE POLICY "Users can insert own events" 
ON subscription_events FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Service role bypass (handled automatically by Supabase when using service role key)

-- Function to check pause eligibility
CREATE OR REPLACE FUNCTION check_pause_eligibility(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_pause_count INTEGER;
  v_last_pause TIMESTAMP WITH TIME ZONE;
  v_total_pause_days INTEGER;
  v_can_pause BOOLEAN;
  v_reason TEXT;
BEGIN
  -- Get pause history
  SELECT 
    pause_count,
    last_pause_date
  INTO 
    v_pause_count,
    v_last_pause
  FROM profiles
  WHERE id = p_user_id;

  -- Calculate total pause days in last 12 months
  SELECT COALESCE(SUM(
    EXTRACT(DAY FROM (event_data->>'resume_date')::timestamp - (event_data->>'pause_date')::timestamp)
  ), 0)::INTEGER
  INTO v_total_pause_days
  FROM subscription_events
  WHERE user_id = p_user_id
    AND event_type = 'subscription_paused'
    AND created_at > NOW() - INTERVAL '12 months';

  -- Check eligibility rules
  IF v_pause_count >= 2 AND v_last_pause > NOW() - INTERVAL '12 months' THEN
    v_can_pause := false;
    v_reason := 'You have already paused your subscription 2 times in the last 12 months';
  ELSIF v_total_pause_days >= 90 THEN
    v_can_pause := false;
    v_reason := 'You have already paused for 90 days in the last 12 months';
  ELSIF v_last_pause IS NOT NULL AND v_last_pause > NOW() - INTERVAL '7 days' THEN
    v_can_pause := false;
    v_reason := 'You must wait at least 7 days between pauses';
  ELSE
    v_can_pause := true;
    v_reason := null;
  END IF;

  RETURN json_build_object(
    'can_pause', v_can_pause,
    'reason', v_reason,
    'pause_count', v_pause_count,
    'total_pause_days', v_total_pause_days
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check discount eligibility
CREATE OR REPLACE FUNCTION check_discount_eligibility(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_profile RECORD;
  v_can_use_discount BOOLEAN;
  v_reason TEXT;
  v_account_age_days INTEGER;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  -- Calculate account age
  v_account_age_days := EXTRACT(DAY FROM NOW() - v_profile.created_at);

  -- Check eligibility rules
  IF v_account_age_days < 60 THEN
    v_can_use_discount := false;
    v_reason := 'Retention discounts are available after 60 days of membership';
  ELSIF v_profile.next_eligible_discount_date IS NOT NULL AND v_profile.next_eligible_discount_date > NOW() THEN
    v_can_use_discount := false;
    v_reason := 'You can use a retention discount again after ' || TO_CHAR(v_profile.next_eligible_discount_date, 'Month DD, YYYY');
  ELSE
    v_can_use_discount := true;
    v_reason := null;
  END IF;

  RETURN json_build_object(
    'can_use_discount', v_can_use_discount,
    'reason', v_reason,
    'discount_used_count', v_profile.discount_used_count,
    'last_discount_date', v_profile.last_discount_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_pause_eligibility TO authenticated;
GRANT EXECUTE ON FUNCTION check_discount_eligibility TO authenticated;