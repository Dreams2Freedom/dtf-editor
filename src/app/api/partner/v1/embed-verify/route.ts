import { NextRequest } from 'next/server';
import { verifyEmbedToken } from '@/lib/partner/embedToken';
import { json, preflight } from '@/lib/partner/http';

/**
 * Partner Tools API — Verify an embed token and return its session context.
 * Called by the embed page (browser) on load to get the image to edit + shop.
 * The token itself is the credential (no API key).
 *
 * POST { token } → { ok, shop, imageUrl }
 */
export const runtime = 'nodejs';

export function OPTIONS() {
  return preflight();
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const token = typeof body.token === 'string' ? body.token : '';
  const claims = verifyEmbedToken(token);
  if (!claims) {
    return json({ ok: false, error: 'Invalid or expired token' }, 401);
  }
  return json({ ok: true, shop: claims.shop, imageUrl: claims.imageUrl });
}
