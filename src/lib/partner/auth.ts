import { createHash } from 'crypto';
import type { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Partner Tools API authentication. External apps (e.g. the Shopify gangsheet
 * builder) authenticate every tool call with an API key sent as
 * `Authorization: Bearer <key>` or `X-API-Key: <key>`. Keys are stored only as
 * a sha256 hash; the raw key is shown once at creation.
 */

export interface PartnerIdentity {
  partnerId: string;
  partnerName: string;
}

export type PartnerAuthResult =
  | { ok: true; partner: PartnerIdentity }
  | { ok: false; status: number; error: string };

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

export async function authenticatePartner(
  request: NextRequest
): Promise<PartnerAuthResult> {
  const authHeader = request.headers.get('authorization') || '';
  const xApiKey = request.headers.get('x-api-key') || '';
  const rawKey = (
    authHeader.replace(/^Bearer\s+/i, '').trim() || xApiKey.trim()
  ).trim();

  if (!rawKey) {
    return { ok: false, status: 401, error: 'Missing API key' };
  }

  const keyHash = hashApiKey(rawKey);
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('partner_api_keys')
    .select('id, name, active')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (error || !data || data.active !== true) {
    return { ok: false, status: 401, error: 'Invalid or inactive API key' };
  }

  return {
    ok: true,
    partner: { partnerId: data.id as string, partnerName: data.name as string },
  };
}
