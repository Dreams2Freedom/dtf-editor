import { NextRequest } from 'next/server';
import { recordUsage } from '@/lib/partner/usage';
import { priceForTool } from '@/lib/partner/pricing';
import { json, preflight, requirePartnerAndShop } from '@/lib/partner/http';
import { persistPartnerResult } from '@/lib/partner/result';
import { vectorizerService } from '@/services/vectorizer';

/**
 * Partner Tools API — Vectorize (Vectorizer.ai).
 * POST { shop, imageUrl } → { resultUrl, usage }
 */
export const runtime = 'nodejs';
export const maxDuration = 120;
const TOOL = 'vectorize';

export function OPTIONS() {
  return preflight();
}

export async function POST(request: NextRequest) {
  const gate = await requirePartnerAndShop(request);
  if (!gate.ok) return gate.response;
  const { partnerId, shop, body } = gate;

  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl : '';
  if (!imageUrl) return json({ error: 'Missing imageUrl' }, 400);

  const result = await vectorizerService.vectorizeImage(imageUrl);

  if (result.status !== 'success' || !result.url) {
    await recordUsage({
      partnerId,
      shopDomain: shop,
      tool: TOOL,
      costCents: 0,
      status: 'error',
      metadata: { error: result.error },
    });
    return json({ error: result.error || 'Vectorize failed' }, 502);
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
  });

  return json({
    resultUrl,
    usage: { tool: TOOL, costCents, eventId: usage?.eventId ?? null },
  });
}
