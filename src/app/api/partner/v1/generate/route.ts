import { NextRequest } from 'next/server';
import { recordUsage } from '@/lib/partner/usage';
import { priceForTool } from '@/lib/partner/pricing';
import { json, preflight, requirePartnerAndShop } from '@/lib/partner/http';
import { persistPartnerResult } from '@/lib/partner/result';
import { chatGPTService } from '@/services/chatgpt';

/**
 * Partner Tools API — AI image generation (OpenAI gpt-image-1).
 * POST { shop, prompt, size?, quality? } → { resultUrl, usage }
 */
export const runtime = 'nodejs';
export const maxDuration = 300;
const TOOL = 'generate';

const SIZES = new Set(['1024x1024', '1024x1792', '1792x1024']);
const QUALITIES = new Set(['low', 'medium', 'high', 'auto']);

export function OPTIONS() {
  return preflight();
}

export async function POST(request: NextRequest) {
  const gate = await requirePartnerAndShop(request);
  if (!gate.ok) return gate.response;
  const { partnerId, shop, body } = gate;

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) return json({ error: 'Missing prompt' }, 400);

  const size = SIZES.has(body.size as string)
    ? (body.size as '1024x1024' | '1024x1792' | '1792x1024')
    : '1024x1024';
  const quality = QUALITIES.has(body.quality as string)
    ? (body.quality as 'low' | 'medium' | 'high' | 'auto')
    : 'medium';

  const result = await chatGPTService.generateImage({ prompt, size, quality });

  const first = result.images?.[0]?.url;
  if (!result.success || !first) {
    await recordUsage({
      partnerId,
      shopDomain: shop,
      tool: TOOL,
      costCents: 0,
      status: 'error',
      metadata: { error: result.error },
    });
    return json({ error: result.error || 'Generation failed' }, 502);
  }

  const resultUrl =
    (await persistPartnerResult(first, { partnerId, shop, tool: TOOL })) ||
    first;
  const costCents = priceForTool(TOOL);
  const usage = await recordUsage({
    partnerId,
    shopDomain: shop,
    tool: TOOL,
    costCents,
    status: 'success',
    resultRef: resultUrl,
    metadata: { size, quality },
  });

  return json({
    resultUrl,
    usage: { tool: TOOL, costCents, eventId: usage?.eventId ?? null },
  });
}
