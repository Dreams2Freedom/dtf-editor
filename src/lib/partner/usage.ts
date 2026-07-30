import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Record one metered tool invocation. The returned event id + cost is echoed
 * back to the caller so the partner app can create the corresponding Shopify
 * usage charge and reconcile against our records.
 */
export interface RecordUsageParams {
  partnerId: string;
  shopDomain: string;
  tool: string;
  costCents: number;
  status: 'success' | 'error';
  resultRef?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UsageRecord {
  eventId: string;
  tool: string;
  costCents: number;
  createdAt: string;
}

export async function recordUsage(
  params: RecordUsageParams
): Promise<UsageRecord | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('tool_usage_events')
    .insert({
      partner_id: params.partnerId,
      shop_domain: params.shopDomain,
      tool: params.tool,
      cost_cents: params.costCents,
      status: params.status,
      result_ref: params.resultRef ?? null,
      metadata: params.metadata ?? {},
    })
    .select('id, created_at')
    .single();

  if (error || !data) {
    // Never fail the tool call just because logging hiccuped, but make it loud.
    console.error('[Partner API] usage log failed:', error);
    return null;
  }

  return {
    eventId: data.id as string,
    tool: params.tool,
    costCents: params.costCents,
    createdAt: data.created_at as string,
  };
}
