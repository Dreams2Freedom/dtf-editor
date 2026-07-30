import { NextRequest } from 'next/server';
import { authenticatePartner } from '@/lib/partner/auth';
import { json, preflight } from '@/lib/partner/http';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Partner Tools API — Usage events list (server-to-server, API-key auth).
 * Recent individual metered events for reconciliation.
 *
 * POST { shop?, from?, to?, limit? } → { events: [...] }
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
  const limit =
    typeof body.limit === 'number' && body.limit > 0
      ? Math.min(500, Math.floor(body.limit))
      : 100;

  const supabase = createServiceRoleClient();
  let query = supabase
    .from('tool_usage_events')
    .select('id, shop_domain, tool, cost_cents, status, result_ref, created_at')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (shop) query = query.eq('shop_domain', shop);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  const { data, error } = await query;
  if (error) {
    console.error('[Partner API] usage events failed:', error);
    return json({ error: 'Could not list usage events' }, 500);
  }

  return json({ events: data || [] });
}
