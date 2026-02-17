-- SEC-015: Persistent webhook event deduplication table
-- Prevents duplicate credit grants when Stripe retries webhook delivery

CREATE TABLE IF NOT EXISTS processed_webhook_events (
  event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type TEXT
);

-- Auto-cleanup: remove events older than 24 hours
CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_processed_at
  ON processed_webhook_events (processed_at);

-- Enable RLS (service role only)
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- No policies needed — only the service role client (used by the webhook handler) can access this table
