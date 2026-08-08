-- Partner Tools API (Phase 1) — metered, API-key-authenticated access to the
-- DTF Editor in-house tools for external apps (e.g. the Shopify gangsheet
-- builder). Every tool call is authenticated by a partner API key and logged as
-- a usage event, priced per tool, so the caller can bill the shop owner
-- (Shopify usage charges) and we can reconcile.

-- Partners (external apps) and their hashed API keys.
CREATE TABLE IF NOT EXISTS public.partner_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,                 -- human label, e.g. "Gangsheet Builder"
  key_hash TEXT NOT NULL UNIQUE,      -- sha256 hex of the raw key (raw key shown once)
  key_prefix TEXT NOT NULL,           -- first chars of the key, for identification
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per metered tool invocation.
CREATE TABLE IF NOT EXISTS public.tool_usage_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID REFERENCES public.partner_api_keys(id) ON DELETE SET NULL,
  shop_domain TEXT NOT NULL,          -- the shop being billed (e.g. store.myshopify.com)
  tool TEXT NOT NULL,                 -- 'background-removal', 'upscale', ...
  cost_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success', -- 'success' | 'error'
  result_ref TEXT,                    -- result URL / storage path
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tool_usage_partner_shop
  ON public.tool_usage_events(partner_id, shop_domain, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_usage_shop_time
  ON public.tool_usage_events(shop_domain, created_at DESC);

-- These tables are accessed only by the server (service_role); no end-user
-- (authenticated/anon) access. Enable RLS and grant to service_role only, plus
-- admin read for the internal dashboard later.
ALTER TABLE public.partner_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_usage_events ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.partner_api_keys TO service_role;
GRANT ALL ON public.tool_usage_events TO service_role;

-- Admins can read usage + keys (metadata only) from the internal admin UI.
DROP POLICY IF EXISTS "admin_read_partner_keys" ON public.partner_api_keys;
CREATE POLICY "admin_read_partner_keys"
  ON public.partner_api_keys FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE));

DROP POLICY IF EXISTS "admin_read_tool_usage" ON public.tool_usage_events;
CREATE POLICY "admin_read_tool_usage"
  ON public.tool_usage_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE));
