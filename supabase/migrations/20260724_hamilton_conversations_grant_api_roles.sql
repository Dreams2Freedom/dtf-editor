-- Root cause of Hamilton conversations not saving (0 rows despite 200s).
--
-- hamilton_conversations was created with RLS enabled + SELECT policies, but the
-- table was never GRANTed to the Supabase API roles. RLS policies and table-level
-- GRANTs are independent: a role needs BOTH to access a table. Because
-- service_role (used by /api/hamilton/ask) had no INSERT grant, every conversation
-- write failed with "permission denied for table" (SQLSTATE 42501). The route only
-- read back `data` and ignored the error, so the failure was silent -- 200
-- responses that persisted nothing. The admin log view's SELECT failed the same
-- way (masked as "no conversations").
--
-- Grant the standard privilege set, matching other API-facing tables such as
-- support_tickets. service_role bypasses RLS but still requires the table GRANT;
-- authenticated is covered by the existing owner-scoped RLS policies.
GRANT ALL ON public.hamilton_conversations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hamilton_conversations TO authenticated;
