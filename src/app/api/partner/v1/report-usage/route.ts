import { NextRequest } from 'next/server';
import { recordUsage } from '@/lib/partner/usage';
import { priceForTool, TOOL_PRICING } from '@/lib/partner/pricing';
import { json, preflight, requirePartnerAndShop } from '@/lib/partner/http';

/**
 * Partner Tools API — Report usage for a CLIENT-SIDE tool.
 *
 * Some in-house tools (halftone, color-change) run entirely in the browser
 * (canvas/dither) inside the embeddable Studio, so there's no server transform
 * to meter. The embed calls this after a successful client-side tool use to
 * record the metered event, so the shop owner is still billed.
 *
 * POST { shop, tool, resultRef? } → { usage }
 */
export const runtime = 'nodejs';
const CLIENT_TOOLS = new Set(['halftone', 'color-change']);

export function OPTIONS() {
  return preflight();
}

export async function POST(request: NextRequest) {
  const gate = await requirePartnerAndShop(request);
  if (!gate.ok) return gate.response;
  const { partnerId, shop, body } = gate;

  const tool = typeof body.tool === 'string' ? body.tool : '';
  if (!tool || !(tool in TOOL_PRICING)) {
    return json({ error: 'Unknown tool' }, 400);
  }
  // Only allow reporting client-side tools here; server tools meter themselves.
  if (!CLIENT_TOOLS.has(tool)) {
    return json(
      { error: 'This tool is metered by its own endpoint, not report-usage' },
      400
    );
  }

  const resultRef =
    typeof body.resultRef === 'string' ? body.resultRef : undefined;
  const costCents = priceForTool(tool);
  const usage = await recordUsage({
    partnerId,
    shopDomain: shop,
    tool,
    costCents,
    status: 'success',
    resultRef,
  });

  return json({
    usage: { tool, costCents, eventId: usage?.eventId ?? null },
  });
}
