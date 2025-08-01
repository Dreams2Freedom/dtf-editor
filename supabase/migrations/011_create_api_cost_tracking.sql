-- Create API cost tracking tables
-- This migration adds comprehensive cost tracking for all API services

-- API service providers enum
CREATE TYPE api_provider AS ENUM ('deep_image', 'clipping_magic', 'vectorizer', 'openai', 'stripe');

-- API operation types
CREATE TYPE api_operation AS ENUM ('upscale', 'background_removal', 'vectorization', 'image_generation', 'payment_processing');

-- Table to store API cost configurations
CREATE TABLE IF NOT EXISTS api_cost_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider api_provider NOT NULL,
  operation api_operation NOT NULL,
  cost_per_unit DECIMAL(10, 4) NOT NULL, -- Cost per API call in USD
  unit_description TEXT NOT NULL, -- e.g., "per image", "per 1000 tokens"
  effective_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE, -- NULL means currently active
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, operation, effective_date)
);

-- Table to track actual API usage and costs
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  upload_id UUID REFERENCES uploads(id) ON DELETE SET NULL,
  provider api_provider NOT NULL,
  operation api_operation NOT NULL,
  processing_status TEXT NOT NULL, -- 'success', 'failed', 'refunded'
  
  -- Cost tracking
  api_cost DECIMAL(10, 4) NOT NULL DEFAULT 0, -- Actual API cost in USD
  credits_charged INTEGER NOT NULL DEFAULT 0, -- Credits charged to user
  credit_value DECIMAL(10, 4) NOT NULL DEFAULT 0, -- Value of credits in USD
  
  -- Additional metadata
  processing_time_ms INTEGER,
  api_response_size_bytes INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Table to track monthly/daily cost summaries for reporting
CREATE TABLE IF NOT EXISTS api_cost_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_date DATE NOT NULL,
  provider api_provider NOT NULL,
  operation api_operation NOT NULL,
  
  -- Metrics
  total_requests INTEGER NOT NULL DEFAULT 0,
  successful_requests INTEGER NOT NULL DEFAULT 0,
  failed_requests INTEGER NOT NULL DEFAULT 0,
  
  -- Costs
  total_api_cost DECIMAL(10, 4) NOT NULL DEFAULT 0,
  total_revenue DECIMAL(10, 4) NOT NULL DEFAULT 0, -- From credits
  gross_profit DECIMAL(10, 4) NOT NULL DEFAULT 0,
  
  -- Performance
  avg_processing_time_ms INTEGER,
  total_processing_time_ms BIGINT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(summary_date, provider, operation)
);

-- Create indexes for performance
CREATE INDEX idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX idx_api_usage_logs_created_at ON api_usage_logs(created_at);
CREATE INDEX idx_api_usage_logs_provider_operation ON api_usage_logs(provider, operation);
CREATE INDEX idx_api_cost_summaries_date ON api_cost_summaries(summary_date DESC);

-- Insert initial cost configurations based on actual API rates
INSERT INTO api_cost_config (provider, operation, cost_per_unit, unit_description) VALUES
  -- Deep-Image.ai costs (actual)
  ('deep_image', 'upscale', 0.08, 'per image'),
  
  -- ClippingMagic costs (actual)
  ('clipping_magic', 'background_removal', 0.125, 'per image'),
  
  -- Vectorizer.ai costs (actual)
  ('vectorizer', 'vectorization', 0.20, 'per image'),
  
  -- OpenAI costs (DALL-E 3 Standard Quality 1024x1024)
  ('openai', 'image_generation', 0.04, 'per image (1024x1024 standard)'),
  
  -- Stripe processing fees
  ('stripe', 'payment_processing', 0.029, 'per transaction + $0.30 fixed');

-- Function to calculate profitability
CREATE OR REPLACE FUNCTION calculate_profitability(
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE(
  provider api_provider,
  operation api_operation,
  total_requests BIGINT,
  total_api_cost DECIMAL,
  total_revenue DECIMAL,
  gross_profit DECIMAL,
  profit_margin DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ul.provider,
    ul.operation,
    COUNT(*)::BIGINT as total_requests,
    SUM(ul.api_cost) as total_api_cost,
    SUM(ul.credit_value) as total_revenue,
    SUM(ul.credit_value - ul.api_cost) as gross_profit,
    CASE 
      WHEN SUM(ul.credit_value) > 0 THEN 
        ROUND(((SUM(ul.credit_value - ul.api_cost) / SUM(ul.credit_value)) * 100)::DECIMAL, 2)
      ELSE 0
    END as profit_margin
  FROM api_usage_logs ul
  WHERE ul.created_at::DATE BETWEEN p_start_date AND p_end_date
    AND ul.processing_status = 'success'
  GROUP BY ul.provider, ul.operation
  ORDER BY gross_profit DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get current API costs
CREATE OR REPLACE FUNCTION get_current_api_costs()
RETURNS TABLE(
  provider api_provider,
  operation api_operation,
  cost_per_unit DECIMAL,
  unit_description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (acc.provider, acc.operation)
    acc.provider,
    acc.operation,
    acc.cost_per_unit,
    acc.unit_description
  FROM api_cost_config acc
  WHERE acc.end_date IS NULL OR acc.end_date > NOW()
  ORDER BY acc.provider, acc.operation, acc.effective_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update summary table
CREATE OR REPLACE FUNCTION update_api_cost_summary()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO api_cost_summaries (
    summary_date,
    provider,
    operation,
    total_requests,
    successful_requests,
    failed_requests,
    total_api_cost,
    total_revenue,
    gross_profit,
    avg_processing_time_ms
  )
  VALUES (
    NEW.created_at::DATE,
    NEW.provider,
    NEW.operation,
    1,
    CASE WHEN NEW.processing_status = 'success' THEN 1 ELSE 0 END,
    CASE WHEN NEW.processing_status = 'failed' THEN 1 ELSE 0 END,
    NEW.api_cost,
    NEW.credit_value,
    NEW.credit_value - NEW.api_cost,
    NEW.processing_time_ms
  )
  ON CONFLICT (summary_date, provider, operation) DO UPDATE SET
    total_requests = api_cost_summaries.total_requests + 1,
    successful_requests = api_cost_summaries.successful_requests + 
      CASE WHEN NEW.processing_status = 'success' THEN 1 ELSE 0 END,
    failed_requests = api_cost_summaries.failed_requests + 
      CASE WHEN NEW.processing_status = 'failed' THEN 1 ELSE 0 END,
    total_api_cost = api_cost_summaries.total_api_cost + NEW.api_cost,
    total_revenue = api_cost_summaries.total_revenue + NEW.credit_value,
    gross_profit = api_cost_summaries.gross_profit + (NEW.credit_value - NEW.api_cost),
    avg_processing_time_ms = CASE 
      WHEN NEW.processing_time_ms IS NOT NULL THEN
        ((api_cost_summaries.avg_processing_time_ms * api_cost_summaries.total_requests) + NEW.processing_time_ms) / 
        (api_cost_summaries.total_requests + 1)
      ELSE api_cost_summaries.avg_processing_time_ms
    END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_api_cost_summary_trigger
AFTER INSERT ON api_usage_logs
FOR EACH ROW
EXECUTE FUNCTION update_api_cost_summary();

-- RLS Policies
ALTER TABLE api_cost_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_cost_summaries ENABLE ROW LEVEL SECURITY;

-- Admin can view all cost data
CREATE POLICY "Admins can view all cost config" ON api_cost_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can view all usage logs" ON api_usage_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can view all cost summaries" ON api_cost_summaries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Users can only see their own usage logs
CREATE POLICY "Users can view own usage logs" ON api_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT ON api_cost_config TO authenticated;
GRANT ALL ON api_usage_logs TO authenticated;
GRANT SELECT ON api_cost_summaries TO authenticated;