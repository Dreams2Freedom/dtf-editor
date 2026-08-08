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

  // DPI-targeted upscale (the API environment's default). When the caller gives
  // a print size, resize to EXACTLY 300 DPI at that size — no more, no less.
  // This prevents the runaway output (a 4x scale can land at ~1000 DPI and blow
  // past the file-size limit); at 300 DPI the file stays sane. Falls back to a
  // plain 2x/4x scale only when no print size is supplied (server-to-server
  // callers that don't pass one).
  const DPI = 300;
  // Guard against absurd targets (e.g. a huge gangsheet) that would exceed
  // limits: cap the longest side so we never request a runaway canvas.
  const MAX_SIDE_PX = 8000;
  const wIn = Number(body.targetWidthInches);
  const hIn = Number(body.targetHeightInches);
  const useDpi = Number.isFinite(wIn) && Number.isFinite(hIn) && wIn > 0 && hIn > 0;

  const upscaleOpts = useDpi
    ? {
        processingMode,
        faceEnhance: body.faceEnhance === true,
        targetWidth: Math.min(MAX_SIDE_PX, Math.round(wIn * DPI)),
        targetHeight: Math.min(MAX_SIDE_PX, Math.round(hIn * DPI)),
      }
    : {
        scale,
        processingMode,
        faceEnhance: body.faceEnhance === true,
      };

  const result = await deepImageService.upscaleImage(imageUrl, upscaleOpts);

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
    metadata: useDpi
      ? { mode: 'dpi', dpi: DPI, widthIn: wIn, heightIn: hIn, processingMode }
      : { mode: 'scale', scale, processingMode },
  });

  return json({
    resultUrl,
    usage: { tool: TOOL, costCents, eventId: usage?.eventId ?? null },
  });
}
