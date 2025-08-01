-- Create email_events table for tracking SendGrid events
CREATE TABLE IF NOT EXISTS email_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  event_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  sg_event_id TEXT UNIQUE,
  sg_message_id TEXT,
  category TEXT[],
  url TEXT,
  reason TEXT,
  status TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_events_email ON email_events(email);
CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_timestamp ON email_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_email_events_created ON email_events(created_at);

-- Add email preference columns to profiles if they don't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_bounced BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_bounce_reason TEXT,
ADD COLUMN IF NOT EXISTS email_spam_reported BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_unsubscribed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_marketing_opted_out BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_transactional_opted_out BOOLEAN DEFAULT false;

-- Create email_templates table for storing custom templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default templates
INSERT INTO email_templates (name, subject, html_content, text_content, variables) VALUES
(
  'admin_notification',
  '{{subject}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Hello {{firstName}},</h2>
    <div style="margin: 20px 0;">
      {{content}}
    </div>
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
    <p style="color: #666; font-size: 14px;">
      This message was sent from DTF Editor admin team.<br>
      If you have any questions, please contact support.
    </p>
  </div>',
  'Hello {{firstName}},\n\n{{content}}\n\nThis message was sent from DTF Editor admin team.\nIf you have any questions, please contact support.',
  '{"subject": "string", "firstName": "string", "content": "string"}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- Create email_queue table for queued emails (future enhancement)
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  to_email TEXT NOT NULL,
  from_email TEXT,
  subject TEXT NOT NULL,
  template_id UUID REFERENCES email_templates(id),
  template_data JSONB,
  html_content TEXT,
  text_content TEXT,
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for email queue
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_for);

-- Add RLS policies for email tables
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Only admins can view email events
CREATE POLICY "Admins can view all email events" ON email_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Only admins can manage email templates
CREATE POLICY "Admins can manage email templates" ON email_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Only admins can manage email queue
CREATE POLICY "Admins can manage email queue" ON email_queue
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Add comment for documentation
COMMENT ON TABLE email_events IS 'Stores SendGrid webhook events for email tracking and analytics';
COMMENT ON TABLE email_templates IS 'Stores custom email templates for admin notifications';
COMMENT ON TABLE email_queue IS 'Queue for sending emails with retry logic';

-- Grant permissions
GRANT ALL ON email_events TO authenticated;
GRANT ALL ON email_templates TO authenticated;
GRANT ALL ON email_queue TO authenticated;