-- Simplified version - Create api_usage_logs table without enum types
-- This version uses TEXT fields instead of custom enums to avoid type errors

-- Drop the table if it exists (for clean re-creation)
DROP TABLE IF EXISTS api_usage_logs CASCADE;

-- Create the api_usage_logs table with TEXT fields instead of enums
CREATE TABLE api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  upload_id UUID,  -- Removed reference to uploads table which might not exist
  provider TEXT NOT NULL CHECK (provider IN ('deep_image', 'clipping_magic', 'vectorizer', 'openai', 'stripe')),
  operation TEXT NOT NULL CHECK (operation IN ('upscale', 'background_removal', 'vectorization', 'image_generation', 'payment_processing')),
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

-- Create indexes for performance
CREATE INDEX idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX idx_api_usage_logs_created_at ON api_usage_logs(created_at);
CREATE INDEX idx_api_usage_logs_provider_operation ON api_usage_logs(provider, operation);

-- Enable Row Level Security
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for admin access
CREATE POLICY "Admin full access to api_usage_logs" ON api_usage_logs
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

-- Create RLS policy for users to view their own logs
CREATE POLICY "Users view own api_usage_logs" ON api_usage_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Grant necessary permissions
GRANT ALL ON api_usage_logs TO authenticated;
GRANT ALL ON api_usage_logs TO service_role;

-- Insert a test record to verify table creation
INSERT INTO api_usage_logs (
  provider,
  operation,
  processing_status,
  api_cost,
  credits_charged,
  credit_value
) VALUES (
  'deep_image',
  'upscale',
  'test_creation',
  0,
  0,
  0
);

-- Delete the test record
DELETE FROM api_usage_logs WHERE processing_status = 'test_creation';

-- Success message
SELECT 'SUCCESS: api_usage_logs table created successfully!' as result;