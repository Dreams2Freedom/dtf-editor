import { NextRequest } from 'next/server';
import { authenticatePartner } from '@/lib/partner/auth';
import { signEmbedToken } from '@/lib/partner/embedToken';
import { json, preflight } from '@/lib/partner/http';

/**
 * Partner Tools API — Mint an embed session token.
 *
 * Called by the partner app's BACKEND (with the secret API key) to open a
 * per-image editing session. Returns a short-lived token + the embed URL to
 * load in an iframe/popup. The token authorizes tool calls from the browser
 * without exposing the API key.
 *
 * POST { shop, imageUrl, ttlSeconds? }
 *   Auth: Authorization: Bearer <partner-api-key>
 * → { token, embedUrl, expiresAt }
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
  const shop = typeof body.shop === 'string' ? body.shop.trim() : '';
  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl : '';
  if (!shop) return json({ error: 'Missing shop' }, 400);
  if (!imageUrl) return json({ error: 'Missing imageUrl' }, 400);

  const ttlSeconds =
    typeof body.ttlSeconds === 'number' &&
    body.ttlSeconds > 0 &&
    body.ttlSeconds <= 7200
      ? Math.floor(body.ttlSeconds)
      : 1800;

  const { token, exp } = signEmbedToken(
    { partnerId, shop, imageUrl },
    ttlSeconds
  );

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const embedUrl = `${origin}/embed/studio?token=${encodeURIComponent(token)}`;

  return json({
    token,
    embedUrl,
    expiresAt: new Date(exp * 1000).toISOString(),
  });
}
