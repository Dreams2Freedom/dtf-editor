-- Fix: Hamilton conversations were not being saved.
--
-- The /api/hamilton/ask route calls supabase.auth.getUser(token) to identify the
-- user, which switches the Supabase client from the service_role into the
-- authenticated role for the rest of the request. The subsequent conversation
-- INSERT/UPDATE therefore runs under RLS as the authenticated user -- but the
-- table only had SELECT policies, so the writes were silently denied (the route
-- reads back only `data` and ignored the `error`). Result: 200 responses with
-- zero rows persisted.
--
-- Add owner-scoped INSERT and UPDATE policies so users can persist their own
-- conversation threads.
DROP POLICY IF EXISTS "insert_own_hamilton_conversations" ON public.hamilton_conversations;
CREATE POLICY "insert_own_hamilton_conversations"
  ON public.hamilton_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_hamilton_conversations" ON public.hamilton_conversations;
CREATE POLICY "update_own_hamilton_conversations"
  ON public.hamilton_conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
