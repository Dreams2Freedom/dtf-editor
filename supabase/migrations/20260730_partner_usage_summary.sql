-- Aggregation for the Partner Tools API usage-summary endpoint (per-shop
-- billing + reconciliation). Sums successful metered uses by tool for a partner,
-- optionally scoped to one shop and a time range.
CREATE OR REPLACE FUNCTION public.partner_usage_summary(
  p_partner_id uuid,
  p_shop text DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS TABLE(tool text, uses bigint, cost_cents bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT
    tool,
    count(*)::bigint AS uses,
    coalesce(sum(cost_cents), 0)::bigint AS cost_cents
  FROM public.tool_usage_events
  WHERE partner_id = p_partner_id
    AND status = 'success'
    AND (p_shop IS NULL OR shop_domain = p_shop)
    AND (p_from IS NULL OR created_at >= p_from)
    AND (p_to IS NULL OR created_at <= p_to)
  GROUP BY tool
$$;

GRANT EXECUTE ON FUNCTION public.partner_usage_summary(uuid, text, timestamptz, timestamptz)
  TO service_role;
