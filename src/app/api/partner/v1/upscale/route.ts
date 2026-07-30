import { NextRequest } from 'next/server';
import { recordUsage } from '@/lib/partner/usage';
import { priceForTool } from '@/lib/partner/pricing';
import { json, preflight, requirePartnerAndShop } from '@/lib/partner/http';
import { persistPartnerResult } from '@/lib/partner/result';
import { deepImageService } from '@/services/deepImage';
import type { ProcessingMode } from '@/services/deepImage';

/**
 * Partner Tools API — Upscale (Deep-Image).
 * POST { shop, imageUrl, scale?: 2|4, processingMode?, faceEnhance? }
 * → { resultUrl, usage }
 */
export const runtime = 'nodejs';
export const maxDuration = 300;
const TOOL = 'upscale';

export function OPTIONS() {
  return preflight();
}

export async function POST(request: NextRequest) {
  const gate = await requirePartnerAndShop(request);
  if (!gate.ok) return gate.response;
  const { partnerId, shop, body } = gate;

  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl : '';
  if (!imageUrl) return json({ error: 'Missing imageUrl' }, 400);

  const scale: 2 | 4 = body.scale === 4 ? 4 : 2;
  const modes: ProcessingMode[] = [
    'auto_enhance',
    'generative_upscale',
    'basic_upscale',
  ];
  const processingMode: ProcessingMode = modes.includes(
    body.processingMode as ProcessingMode
  )
    ? (body.processingMode as ProcessingMode)
    : 'auto_enhance';

  const result = await deepImageService.upscaleImage(imageUrl, {
    scale,
    processingMode,
    faceEnhance: body.faceEnhance === true,
  });

  if (result.status !== 'success' || !result.url) {
    await recordUsage({
      partnerId,
      shopDomain: shop,
      tool: TOOL,
      costCents: 0,
      status: 'error',
      metadata: { error: result.error },
    });
    return json({ error: result.error || 'Upscale failed' }, 502);
  }

  const resultUrl =
    (await persistPartnerResult(result.url, { partnerId, shop, tool: TOOL })) ||
    result.url;
  const costCents = priceForTool(TOOL);
  const usage = await recordUsage({
    partnerId,
    shopDomain: shop,
    tool: TOOL,
    costCents,
    status: 'success',
    resultRef: resultUrl,
    metadata: { scale, processingMode },
  });

  return json({
    resultUrl,
    usage: { tool: TOOL, costCents, eventId: usage?.eventId ?? null },
  });
}
