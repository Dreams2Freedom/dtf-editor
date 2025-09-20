-- Create processing_jobs table for async processing
CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL, -- 'upscale', 'vectorize', 'background-removal', etc.
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  progress INTEGER DEFAULT 0, -- Progress percentage (0-100)
  input_data JSONB NOT NULL, -- Store input parameters
  output_data JSONB, -- Store results when complete
  error_message TEXT, -- Store error if failed
  retry_count INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_processing_jobs_user_id ON processing_jobs(user_id);
CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX idx_processing_jobs_created_at ON processing_jobs(created_at DESC);

-- Enable RLS
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own jobs" ON processing_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own jobs" ON processing_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all jobs" ON processing_jobs
  FOR ALL USING (auth.role() = 'service_role');

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_processing_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_processing_jobs_updated_at_trigger
  BEFORE UPDATE ON processing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_processing_jobs_updated_at();

-- Function to clean up old completed/failed jobs (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_processing_jobs()
RETURNS void AS $$
BEGIN
  DELETE FROM processing_jobs
  WHERE (status IN ('completed', 'failed'))
    AND created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;