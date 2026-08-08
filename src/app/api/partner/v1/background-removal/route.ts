import { NextRequest } from 'next/server';
import { env } from '@/config/env';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { json, preflight, requirePartnerAndShop } from '@/lib/partner/http';
import { recordUsage } from '@/lib/partner/usage';
import { priceForTool } from '@/lib/partner/pricing';

/**
 * Partner Tools API — In-house background removal (SAM).
 *
 * POST /api/partner/v1/background-removal
 *   Auth:  Authorization: Bearer <partner-api-key> (or X-API-Key) for
 *          server-to-server calls, OR X-Embed-Token for the browser embed
 *          Studio. Both are handled by requirePartnerAndShop — matching the
 *          Upscale/Vectorize/DPI routes. (Previously this route used
 *          authenticatePartner directly, so the embed's X-Embed-Token call was
 *          rejected with "Missing API key" — the embed Remove BG never ran.)
 *   Body:  { imageUrl: "https://..." }  (+ { shop } for API-key callers; the
 *          embed's shop comes from the signed token)
 *   Returns: { resultUrl, usage: { tool, costCents, eventId } }
 *
 * Uses ONLY the in-house SAM engine (no ClippingMagic). Each call is metered so
 * the partner app can bill the shop owner via Shopify usage charges.
 */

export const runtime = 'nodejs';
export const maxDuration = 120; // in-house SAM can take a while on CPU.

const TOOL = 'background-removal';

export function OPTIONS() {
  return preflight();
}

export async function POST(request: NextRequest) {
  const gate = await requirePartnerAndShop(request);
  if (!gate.ok) return gate.response;
  const { partnerId, shop, body } = gate;

  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl : '';
  if (!imageUrl) return json({ error: 'Missing imageUrl' }, 400);

  if (!env.REMBG_SERVICE_URL) {
    console.error(
      '[Partner API] Background removal unconfigured: REMBG_SERVICE_URL is empty'
    );
    return json({ error: 'Background removal is not configured' }, 503);
  }
  // Diagnostic only — do NOT hard-fail on an empty key. The SAM service enforces
  // auth only when it ITSELF has a key set (main.py: `if API_KEY and ...`), so an
  // empty key here is valid when the service runs keyless. If the service DOES
  // require a key, an empty/mismatched value yields a 401 from the engine, which
  // is surfaced with its real status in the upstream-error branch below.
  if (!env.REMBG_SERVICE_API_KEY) {
    console.warn(
      '[Partner API] REMBG_SERVICE_API_KEY is empty — if the SAM service requires a key, expect an upstream 401'
    );
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
      // Surface the engine's REAL error to the partner instead of a blank 502,
      // so an unconfigured engine (503) or a key mismatch (401 Unauthorized) is
      // self-evident rather than masquerading as a generic failure. Mirrors the
      // Studio embed route's upstream-error passthrough.
      let detail = 'Background removal failed';
      try {
        const body = await svcRes.json();
        if (body?.detail) detail = String(body.detail);
      } catch {
        try {
          const text = await svcRes.text();
          if (text) detail = text.slice(0, 500);
        } catch {}
      }
      console.error('[Partner API] SAM service error:', svcRes.status, detail);
      await recordUsage({
        partnerId,
        shopDomain: shop,
        tool: TOOL,
        costCents: 0,
        status: 'error',
        metadata: { reason: `service_${svcRes.status}`, detail },
      });
      return json(
        { error: detail, upstreamStatus: svcRes.status },
        svcRes.status === 503 ? 503 : 502
      );
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
