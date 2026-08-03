-- Link Hamilton conversations to the support ticket they generated.
-- Lets us (a) create the escalation ticket exactly once per conversation and
-- (b) back-fill tickets for conversations that were handed to support before
-- auto-ticket creation existed, without producing duplicates on re-run.
ALTER TABLE public.hamilton_conversations
  ADD COLUMN IF NOT EXISTS support_ticket_id UUID
    REFERENCES public.support_tickets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_hamilton_conversations_support_ticket
  ON public.hamilton_conversations(support_ticket_id);
