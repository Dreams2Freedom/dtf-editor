import { NextRequest } from 'next/server';
import { authenticatePartner } from '@/lib/partner/auth';
import { json, preflight } from '@/lib/partner/http';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Partner Tools API — Usage summary (server-to-server, API-key auth).
 *
 * Aggregates successful metered uses for the partner, optionally scoped to one
 * shop and a time range — the source of truth for creating Shopify usage
 * charges and reconciliation.
 *
 * POST { shop?, from?, to? }   // from/to are ISO timestamps
 * → { shop, from, to, byTool: { [tool]: { uses, costCents } },
 *     totalUses, totalCents }
 */
export const runtime = 'nodejs';

export function OPTIONS() {
  return preflight();
}

export async function POST(request: NextRequest) {
  const authRes = await authenticatePartner(request);
  if (!authRes.ok) return json({ error: authRes.error }, authRes.status);
  const { partnerId } = authRes.partner;

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const shop = typeof body.shop === 'string' ? body.shop.trim() : null;
  const from = typeof body.from === 'string' ? body.from : null;
  const to = typeof body.to === 'string' ? body.to : null;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc('partner_usage_summary', {
    p_partner_id: partnerId,
    p_shop: shop,
    p_from: from,
    p_to: to,
  });

  if (error) {
    console.error('[Partner API] usage summary failed:', error);
    return json({ error: 'Could not compute usage summary' }, 500);
  }

  const rows = (data || []) as Array<{
    tool: string;
    uses: number;
    cost_cents: number;
  }>;
  const byTool: Record<string, { uses: number; costCents: number }> = {};
  let totalUses = 0;
  let totalCents = 0;
  for (const r of rows) {
    byTool[r.tool] = { uses: Number(r.uses), costCents: Number(r.cost_cents) };
    totalUses += Number(r.uses);
    totalCents += Number(r.cost_cents);
  }

  return json({ shop, from, to, byTool, totalUses, totalCents });
}
