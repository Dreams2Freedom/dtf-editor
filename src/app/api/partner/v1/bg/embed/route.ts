import { NextRequest } from 'next/server';
import { env } from '@/config/env';
import { json, preflight, requirePartnerAndShop } from '@/lib/partner/http';

/**
 * Partner Tools API — SAM embedding for the embed's interactive click-select.
 *
 * POST /api/partner/v1/bg/embed
 *   Auth:  X-Embed-Token (or partner API key + { shop })
 *   Body:  { imageUrl: "https://..." }
 *   Returns: { embedding_id, width, height } from the SAM service
 *
 * The browser computes the embedding once, then calls /bg/predict per click.
 * Refinement plumbing — FREE (records no usage). Only the initial cut is metered.
 */
export const runtime = 'nodejs';
export const maxDuration = 60;

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
    const svc = await fetch(`${env.REMBG_SERVICE_URL}/embed`, {
      method: 'POST',
      headers: { 'X-API-Key': env.REMBG_SERVICE_API_KEY },
      body: upstream,
    });
    if (!svc.ok) {
      const text = await svc.text().catch(() => '');
      console.error('[Partner API] bg/embed service error:', svc.status, text);
      return json({ error: 'Embedding failed' }, 502);
    }
    return json(await svc.json());
  } catch (e) {
    console.error('[Partner API] bg/embed unreachable:', e);
    return json({ error: 'Embedding service unreachable' }, 502);
  }
}
