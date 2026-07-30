/**
 * Per-tool price (in cents) charged to the shop owner for one metered use via
 * the Partner Tools API. These are placeholders — tune to the real margins.
 * Tools with an in-house engine (background removal, halftone) always use the
 * in-house path here; there is no ClippingMagic in the partner API.
 */
export const TOOL_PRICING: Record<string, number> = {
  'background-removal': 5, // in-house SAM engine
  upscale: 8, // Deep-Image
  vectorize: 10, // Vectorizer.ai
  halftone: 3, // in-house
  'dpi-check': 1,
  'color-change': 3, // in-house
  generate: 12, // OpenAI
};

export type ToolName = keyof typeof TOOL_PRICING;

export function priceForTool(tool: string): number {
  return TOOL_PRICING[tool] ?? 0;
}
