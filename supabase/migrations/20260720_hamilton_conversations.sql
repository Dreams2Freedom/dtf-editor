-- Hamilton support-bot conversations. Persisted like support tickets so admins
-- can review common questions. Each row is one chat thread for a user; the full
-- message list is stored as JSONB (role: 'user' | 'assistant', content, ts).
CREATE TABLE IF NOT EXISTS public.hamilton_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  escalated_to_ticket BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hamilton_conversations_user
  ON public.hamilton_conversations(user_id, created_at DESC);
ALTER TABLE public.hamilton_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_hamilton_conversations" ON public.hamilton_conversations;
CREATE POLICY "own_hamilton_conversations"
  ON public.hamilton_conversations FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "admin_read_hamilton_conversations" ON public.hamilton_conversations;
CREATE POLICY "admin_read_hamilton_conversations"
  ON public.hamilton_conversations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE));
