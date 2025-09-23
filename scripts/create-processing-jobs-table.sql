-- Create processing_jobs table for async image processing
CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('upscale', 'background_removal', 'vectorization', 'generation')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  input_data JSONB NOT NULL DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_dates CHECK (
    (started_at IS NULL OR started_at >= created_at) AND
    (completed_at IS NULL OR completed_at >= started_at)
  )
);

-- Create indexes for performance
CREATE INDEX idx_processing_jobs_user_id ON processing_jobs(user_id);
CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX idx_processing_jobs_created_at ON processing_jobs(created_at DESC);
CREATE INDEX idx_processing_jobs_user_status ON processing_jobs(user_id, status);

-- Enable Row Level Security (RLS)
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own jobs
CREATE POLICY "Users can view their own jobs" ON processing_jobs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policy: Users can create their own jobs
CREATE POLICY "Users can create their own jobs" ON processing_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policy: Users can update their own pending/processing jobs (to cancel)
CREATE POLICY "Users can cancel their own jobs" ON processing_jobs
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status IN ('pending', 'processing'))
  WITH CHECK (user_id = auth.uid() AND status = 'cancelled');

-- RLS Policy: Service role can do everything (for background processing)
CREATE POLICY "Service role full access" ON processing_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON processing_jobs TO authenticated;
GRANT ALL ON processing_jobs TO service_role;

-- Add comment
COMMENT ON TABLE processing_jobs IS 'Tracks async processing jobs for image operations';
COMMENT ON COLUMN processing_jobs.job_type IS 'Type of processing operation';
COMMENT ON COLUMN processing_jobs.status IS 'Current status of the job';
COMMENT ON COLUMN processing_jobs.progress IS 'Processing progress from 0 to 100';
COMMENT ON COLUMN processing_jobs.input_data IS 'Input parameters for the job';
COMMENT ON COLUMN processing_jobs.output_data IS 'Results of the processing job';
COMMENT ON COLUMN processing_jobs.error_message IS 'Error details if job failed';

SELECT 'SUCCESS: processing_jobs table created!' as result;