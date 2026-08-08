import { NextRequest } from 'next/server';
import { env } from '@/config/env';
import { json, preflight, requirePartnerAndShop } from '@/lib/partner/http';

/**
 * Partner Tools API — background-detection for the embed's interactive brush.
 *
 * POST /api/partner/v1/bg/detect
 *   Auth:  X-Embed-Token (or partner API key + { shop })
 *   Body:  { imageUrl: "https://..." }
 *   Returns: SAM /detect-bg JSON (dominant bg colour, variance, recommended mode)
 *
 * This is refinement plumbing for the in-house SAM brush — FREE (records no
 * usage). Only the initial background-removal cut is metered.
 */
export const runtime = 'nodejs';
export const maxDuration = 30;

export function OPTIONS() {
  return preflight();
}

export async function POST(request: NextRequest) {
  const gate = await requirePartnerAndShop(request);
  if (!gate.ok) return gate.response;
  const { body } = gate;

  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl : '';
  if (!imageUrl) return json({ error: 'Missing imageUrl' }, 400);
  if (!env.REMBG_SERVICE_URL) {
    return json({ error: 'Background removal is not configured' }, 503);
  }

  const srcRes = await fetch(imageUrl).catch(() => null);
  if (!srcRes || !srcRes.ok) {
    return json({ error: 'Could not fetch imageUrl' }, 502);
  }
  const srcBlob = await srcRes.blob();

  const upstream = new FormData();
  upstream.append('image', srcBlob, 'image.png');

  try {
    const svc = await fetch(`${env.REMBG_SERVICE_URL}/detect-bg`, {
      method: 'POST',
      headers: { 'X-API-Key': env.REMBG_SERVICE_API_KEY },
      body: upstream,
    });
    if (!svc.ok) {
      const text = await svc.text().catch(() => '');
      console.error('[Partner API] bg/detect service error:', svc.status, text);
      return json({ error: 'Background detection failed' }, 502);
    }
    return json(await svc.json());
  } catch (e) {
    console.error('[Partner API] bg/detect unreachable:', e);
    return json({ error: 'Detection service unreachable' }, 502);
  }
}
