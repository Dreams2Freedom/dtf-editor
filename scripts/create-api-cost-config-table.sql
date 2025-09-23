-- Create api_cost_config table for dynamic cost management
CREATE TABLE IF NOT EXISTS api_cost_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('deep_image', 'clipping_magic', 'vectorizer', 'openai', 'stripe')),
  operation TEXT NOT NULL CHECK (operation IN ('upscale', 'background_removal', 'vectorization', 'image_generation', 'payment_processing')),
  cost_per_unit DECIMAL(10, 4) NOT NULL,
  unit_description TEXT NOT NULL,
  effective_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, operation, effective_date)
);

-- Enable RLS
ALTER TABLE api_cost_config ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy
CREATE POLICY "Admin full access to api_cost_config" ON api_cost_config
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

-- Grant permissions
GRANT ALL ON api_cost_config TO authenticated;
GRANT ALL ON api_cost_config TO service_role;

-- Insert initial cost configurations
INSERT INTO api_cost_config (provider, operation, cost_per_unit, unit_description, notes) VALUES
  ('deep_image', 'upscale', 0.08, 'per image', 'Current rate as of 2025'),
  ('clipping_magic', 'background_removal', 0.125, 'per image', 'Current rate as of 2025'),
  ('vectorizer', 'vectorization', 0.20, 'per image', 'Current rate as of 2025'),
  ('openai', 'image_generation', 0.04, 'per image (1024x1024)', 'DALL-E 3 standard resolution'),
  ('stripe', 'payment_processing', 0.029, 'per transaction (+ $0.30 fixed)', '2.9% + $0.30 per transaction')
ON CONFLICT (provider, operation, effective_date) DO NOTHING;

SELECT 'SUCCESS: api_cost_config table created and populated!' as result;