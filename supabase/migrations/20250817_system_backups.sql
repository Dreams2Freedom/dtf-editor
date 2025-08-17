-- Create system_backups table for tracking backup history
CREATE TABLE IF NOT EXISTS public.system_backups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  table_count INTEGER NOT NULL DEFAULT 0,
  total_rows INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  environment TEXT,
  storage_location TEXT,
  file_size BIGINT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX idx_system_backups_date ON public.system_backups(backup_date DESC);
CREATE INDEX idx_system_backups_status ON public.system_backups(status);

-- Enable RLS
ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;

-- Only service role can access backup records
CREATE POLICY "Service role can manage backups" ON public.system_backups
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Add comment
COMMENT ON TABLE public.system_backups IS 'Tracks database backup history and metadata';

-- Grant permissions
GRANT ALL ON public.system_backups TO service_role;
GRANT SELECT ON public.system_backups TO authenticated;