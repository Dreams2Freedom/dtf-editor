-- Create the missing api_usage_logs table
-- This is extracted from the full migration for just the missing table

-- First, ensure enum types exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'api_provider') THEN
        CREATE TYPE api_provider AS ENUM ('deep_image', 'clipping_magic', 'vectorizer', 'openai', 'stripe');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'api_operation') THEN
        CREATE TYPE api_operation AS ENUM ('upscale', 'background_removal', 'vectorization', 'image_generation', 'payment_processing');
    END IF;
END $$;

-- Create the api_usage_logs table
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  upload_id UUID REFERENCES uploads(id) ON DELETE SET NULL,
  provider api_provider NOT NULL,
  operation api_operation NOT NULL,
  processing_status TEXT NOT NULL,
  api_cost DECIMAL(10, 4) NOT NULL DEFAULT 0,
  credits_charged INTEGER NOT NULL DEFAULT 0,
  credit_value DECIMAL(10, 4) NOT NULL DEFAULT 0,
  processing_time_ms INTEGER,
  api_response_size_bytes INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_provider_operation ON api_usage_logs(provider, operation);

-- Enable RLS
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can view all usage logs" ON api_usage_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can view own usage logs" ON api_usage_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Grant permissions
GRANT ALL ON api_usage_logs TO authenticated;

-- Success message
SELECT 'api_usage_logs table created successfully!' as message;