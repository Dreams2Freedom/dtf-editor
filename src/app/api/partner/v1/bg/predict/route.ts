import { NextRequest } from 'next/server';
import { env } from '@/config/env';
import { json, preflight, requirePartnerAndShop } from '@/lib/partner/http';
import { CORS_HEADERS } from '@/lib/partner/http';

/**
 * Partner Tools API — SAM point-prediction for interactive click-select.
 *
 * POST /api/partner/v1/bg/predict
 *   Auth:  X-Embed-Token (or partner API key + { shop })
 *   Body:  { embeddingId: "...", points: [{ x, y, label }] }
 *          (label 1 = include / 0 = exclude; matches the SAM service contract)
 *   Returns: image/png cutout mask for the selected object.
 *
 * Uses the embedding from /bg/embed — no image bytes needed here. Refinement
 * plumbing — FREE (records no usage). Only the initial cut is metered.
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

  const embeddingId =
    typeof body.embeddingId === 'string'
      ? body.embeddingId
      : typeof body.embedding_id === 'string'
        ? body.embedding_id
        : '';
  const points = body.points;
  if (!embeddingId || !points) {
    return json({ error: 'embeddingId and points are required' }, 400);
  }
  if (!env.REMBG_SERVICE_URL) {
    return json({ error: 'Background removal is not configured' }, 503);
  }

  const upstream = new FormData();
  upstream.append('embedding_id', embeddingId);
  upstream.append(
    'points',
    typeof points === 'string' ? points : JSON.stringify(points)
  );

  try {
    const svc = await fetch(`${env.REMBG_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'X-API-Key': env.REMBG_SERVICE_API_KEY },
      body: upstream,
    });
    if (!svc.ok) {
      const text = await svc.text().catch(() => '');
      console.error(
        '[Partner API] bg/predict service error:',
        svc.status,
        text
      );
      return json({ error: 'Prediction failed' }, 502);
    }
    // SAM /predict returns a PNG mask — stream it back with CORS headers.
    const buffer = await svc.arrayBuffer();
    return new Response(buffer, {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'image/png' },
    });
  } catch (e) {
    console.error('[Partner API] bg/predict unreachable:', e);
    return json({ error: 'Prediction service unreachable' }, 502);
  }
}
