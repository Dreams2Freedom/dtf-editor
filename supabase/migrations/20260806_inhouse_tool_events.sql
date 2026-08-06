-- In-house tool analytics — dedicated event log.
--
-- Purpose: collect success / error / usage data for our OWN (free, in-house)
-- tools — starting with SAM background removal — so admins can see how well the
-- in-house engine performs and how much it's used. This is deliberately SEPARATE
-- from `api_usage_logs`:
--   * api_usage_logs is billing/cost analytics for THIRD-PARTY providers and its
--     `provider`/`operation` columns are Postgres ENUMs with no in-house value.
--     Adding in-house rows there would need enum surgery and would pollute the
--     profit-margin math (in-house tools are free / zero API cost).
--   * This table uses plain TEXT columns (no enum coupling) and carries only what
--     the in-house tracker needs. Nothing here touches credits, billing, or the
--     existing cost analytics.
--
-- Writes come only from server routes via the service-role key. RLS is enabled
-- with NO anon/authenticated policy, so the table is invisible to the browser;
-- the admin dashboard reads it through a service-role API route.

CREATE TABLE IF NOT EXISTS inhouse_tool_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  tool TEXT NOT NULL,               -- e.g. 'background-removal'
  operation TEXT NOT NULL,          -- e.g. 'sam-auto' | 'ml-color'
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  processing_time_ms INTEGER,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Time-window scans (the dashboard always filters by a recent window).
CREATE INDEX IF NOT EXISTS idx_inhouse_tool_events_created_at
  ON inhouse_tool_events (created_at DESC);
-- Per-tool / per-status breakdowns.
CREATE INDEX IF NOT EXISTS idx_inhouse_tool_events_tool_status
  ON inhouse_tool_events (tool, status, created_at DESC);

-- Lock it down: browser clients (anon + authenticated) get no access at all.
-- Only the service role (used by server routes) can read/write, which it does
-- by bypassing RLS. No policies are created on purpose.
ALTER TABLE inhouse_tool_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON inhouse_tool_events FROM anon, authenticated;
GRANT SELECT, INSERT ON inhouse_tool_events TO service_role;

COMMENT ON TABLE inhouse_tool_events IS
  'Success/error/usage events for free in-house tools (e.g. SAM background removal). Written by server routes via service role; read by the admin In-House Tools dashboard. Separate from api_usage_logs (third-party billing analytics).';
