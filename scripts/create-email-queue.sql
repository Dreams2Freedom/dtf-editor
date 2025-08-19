-- Create email queue table for reliable email sending
CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type VARCHAR(50) NOT NULL,
  email_to VARCHAR(255) NOT NULL,
  email_data JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON public.email_queue(created_at);

-- Enable RLS
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- Admin users can view all emails
CREATE POLICY "Admin users can view all emails" ON public.email_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Service role can do everything
CREATE POLICY "Service role can manage email queue" ON public.email_queue
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to automatically queue welcome email on user creation
CREATE OR REPLACE FUNCTION public.queue_welcome_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Queue welcome email for new user
  INSERT INTO public.email_queue (
    user_id,
    email_type,
    email_to,
    email_data
  ) VALUES (
    NEW.id,
    'welcome',
    NEW.email,
    jsonb_build_object(
      'firstName', COALESCE(NEW.raw_user_meta_data->>'firstName', ''),
      'lastName', COALESCE(NEW.raw_user_meta_data->>'lastName', ''),
      'company', COALESCE(NEW.raw_user_meta_data->>'company', '')
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_welcome_email();

-- Grant necessary permissions
GRANT ALL ON public.email_queue TO service_role;
GRANT SELECT ON public.email_queue TO authenticated;