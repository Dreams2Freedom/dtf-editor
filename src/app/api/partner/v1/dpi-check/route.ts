import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { recordUsage } from '@/lib/partner/usage';
import { priceForTool } from '@/lib/partner/pricing';
import { json, preflight, requirePartnerAndShop } from '@/lib/partner/http';

/**
 * Partner Tools API — DPI check (in-house, no external API).
 * POST { shop, imageUrl, targetWidthInches, targetHeightInches }
 * → { pixels, dpi, meetsStandard, maxSizeAtStandardInches, usage }
 * Reports whether the artwork holds up at print size; does NOT transform it.
 */
export const runtime = 'nodejs';
export const maxDuration = 60;
const TOOL = 'dpi-check';
const DPI_STANDARD = 300;

export function OPTIONS() {
  return preflight();
}

export async function POST(request: NextRequest) {
  const gate = await requirePartnerAndShop(request);
  if (!gate.ok) return gate.response;
  const { partnerId, shop, body } = gate;

  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl : '';
  if (!imageUrl) return json({ error: 'Missing imageUrl' }, 400);
  const targetW = Number(body.targetWidthInches);
  const targetH = Number(body.targetHeightInches);
  if (!(targetW > 0) || !(targetH > 0)) {
    return json(
      { error: 'Missing/invalid targetWidthInches & targetHeightInches' },
      400
    );
  }

  const res = await fetch(imageUrl).catch(() => null);
  if (!res || !res.ok) return json({ error: 'Could not fetch imageUrl' }, 502);
  const buf = Buffer.from(await res.arrayBuffer());

  let width = 0;
  let height = 0;
  try {
    const meta = await sharp(buf).metadata();
    width = meta.width || 0;
    height = meta.height || 0;
  } catch {
    return json({ error: 'Could not read image' }, 400);
  }
  if (!width || !height) {
    return json({ error: 'Could not determine image dimensions' }, 400);
  }

  const dpiH = Math.round(width / targetW);
  const dpiV = Math.round(height / targetH);
  const dpiMin = Math.min(dpiH, dpiV);
  const meetsStandard = dpiMin >= DPI_STANDARD;

  const costCents = priceForTool(TOOL);
  const usage = await recordUsage({
    partnerId,
    shopDomain: shop,
    tool: TOOL,
    costCents,
    status: 'success',
    metadata: { width, height, dpiMin, meetsStandard },
  });

  return json({
    pixels: { width, height },
    printSizeInches: { width: targetW, height: targetH },
    dpi: { horizontal: dpiH, vertical: dpiV, min: dpiMin },
    standard: DPI_STANDARD,
    meetsStandard,
    maxSizeAtStandardInches: {
      width: Number((width / DPI_STANDARD).toFixed(2)),
      height: Number((height / DPI_STANDARD).toFixed(2)),
    },
    usage: { tool: TOOL, costCents, eventId: usage?.eventId ?? null },
  });
}
