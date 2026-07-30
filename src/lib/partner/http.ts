import { NextRequest, NextResponse } from 'next/server';
import { authenticatePartner } from './auth';

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

/** Authenticate the partner and require a `shop` in the JSON body. */
export async function requirePartnerAndShop(
  request: NextRequest
): Promise<PartnerGate> {
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
