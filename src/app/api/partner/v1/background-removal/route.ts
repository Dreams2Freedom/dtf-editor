import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/config/env';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { authenticatePartner } from '@/lib/partner/auth';
import { recordUsage } from '@/lib/partner/usage';
import { priceForTool } from '@/lib/partner/pricing';

/**
 * Partner Tools API — In-house background removal (SAM).
 *
 * POST /api/partner/v1/background-removal
 *   Auth:  Authorization: Bearer <partner-api-key>   (or X-API-Key)
 *   Body:  { shop: "store.myshopify.com", imageUrl: "https://..." }
 *   Returns: { resultUrl, usage: { tool, costCents, eventId } }
 *
 * Uses ONLY the in-house SAM engine (no ClippingMagic). Each call is metered so
 * the partner app can bill the shop owner via Shopify usage charges.
 */

export const runtime = 'nodejs';
export const maxDuration = 120; // in-house SAM can take a while on CPU.

const TOOL = 'background-removal';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  const authRes = await authenticatePartner(request);
  if (!authRes.ok) {
    return json({ error: authRes.error }, authRes.status);
  }
  const { partnerId } = authRes.partner;

  const body = await request.json().catch(() => ({}));
  const shop = typeof body.shop === 'string' ? body.shop.trim() : '';
  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl : '';
  if (!shop) return json({ error: 'Missing shop' }, 400);
  if (!imageUrl) return json({ error: 'Missing imageUrl' }, 400);

  if (!env.REMBG_SERVICE_URL) {
    return json({ error: 'Background removal is not configured' }, 503);
  }

  // Fetch the source image.
  const srcRes = await fetch(imageUrl).catch(() => null);
  if (!srcRes || !srcRes.ok) {
    return json({ error: 'Could not fetch imageUrl' }, 502);
  }
  const srcBlob = await srcRes.blob();

  // Run the in-house SAM engine (segment-everything), cutout only (no overlay).
  const upstream = new FormData();
  upstream.append('image', srcBlob, 'image.png');
  upstream.append('overlay', 'false');

  let cutoutB64: string;
  try {
    const svcRes = await fetch(`${env.REMBG_SERVICE_URL}/segment-everything`, {
      method: 'POST',
      headers: { 'X-API-Key': env.REMBG_SERVICE_API_KEY },
      body: upstream,
    });
    if (!svcRes.ok) {
      const text = await svcRes.text().catch(() => '');
      console.error('[Partner API] SAM service error:', svcRes.status, text);
      await recordUsage({
        partnerId,
        shopDomain: shop,
        tool: TOOL,
        costCents: 0,
        status: 'error',
        metadata: { reason: `service_${svcRes.status}` },
      });
      return json({ error: 'Background removal failed' }, 502);
    }
    const data = await svcRes.json();
    cutoutB64 = data.cutout_png;
    if (!cutoutB64) throw new Error('no cutout in response');
  } catch (e) {
    console.error('[Partner API] SAM call failed:', e);
    await recordUsage({
      partnerId,
      shopDomain: shop,
      tool: TOOL,
      costCents: 0,
      status: 'error',
      metadata: { reason: 'service_unreachable' },
    });
    return json({ error: 'Background removal service unreachable' }, 502);
  }

  // Store the result and return a public URL.
  const buffer = Buffer.from(cutoutB64, 'base64');
  const safeShop = shop.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `partners/${partnerId}/${safeShop}/${Date.now()}-bg.png`;
  const supabase = createServiceRoleClient();
  const { error: upErr } = await supabase.storage
    .from('images')
    .upload(path, buffer, { contentType: 'image/png', upsert: true });
  if (upErr) {
    console.error('[Partner API] result upload failed:', upErr);
    return json({ error: 'Could not store result' }, 500);
  }
  const { data: pub } = supabase.storage.from('images').getPublicUrl(path);
  const resultUrl = pub?.publicUrl || '';

  const costCents = priceForTool(TOOL);
  const usage = await recordUsage({
    partnerId,
    shopDomain: shop,
    tool: TOOL,
    costCents,
    status: 'success',
    resultRef: resultUrl,
    metadata: { source: imageUrl },
  });

  return json({
    resultUrl,
    usage: {
      tool: TOOL,
      costCents,
      eventId: usage?.eventId ?? null,
    },
  });
}
