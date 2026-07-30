import { NextRequest, NextResponse } from 'next/server';
import { authenticatePartner } from './auth';
import { verifyEmbedToken } from './embedToken';

/**
 * Shared HTTP helpers for the Partner Tools API: permissive CORS (the API key
 * is the security boundary, not the origin), a JSON responder, and a request
 * gate that authenticates the partner and pulls the required `shop`.
 */
export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export function preflight() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export type PartnerGate =
  | {
      ok: true;
      partnerId: string;
      shop: string;
      body: Record<string, unknown>;
    }
  | { ok: false; response: NextResponse };

/**
 * Authenticate a tool call and resolve { partnerId, shop }. Accepts EITHER:
 *  - a partner API key (server-to-server) — shop comes from the JSON body, or
 *  - an embed session token via the `X-Embed-Token` header (browser embed) —
 *    partnerId + shop come from the signed token, so the browser can't forge
 *    which shop is billed.
 */
export async function requirePartnerAndShop(
  request: NextRequest
): Promise<PartnerGate> {
  const embedToken = request.headers.get('x-embed-token');
  if (embedToken) {
    const claims = verifyEmbedToken(embedToken);
    if (!claims) {
      return {
        ok: false,
        response: json({ error: 'Invalid or expired embed token' }, 401),
      };
    }
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    return { ok: true, partnerId: claims.partnerId, shop: claims.shop, body };
  }

  const authRes = await authenticatePartner(request);
  if (!authRes.ok) {
    return { ok: false, response: json({ error: authRes.error }, authRes.status) };
  }
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const shop = typeof body.shop === 'string' ? body.shop.trim() : '';
  if (!shop) {
    return { ok: false, response: json({ error: 'Missing shop' }, 400) };
  }
  return { ok: true, partnerId: authRes.partner.partnerId, shop, body };
}
