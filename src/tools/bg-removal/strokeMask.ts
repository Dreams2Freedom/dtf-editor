/**
 * Rasterize the user's brush history into binary masks per tool.
 *
 * The Panel keeps `strokeHistoryRef` as `StrokeRecord[]` — each entry
 * has `tool` ('keep' | 'remove'), the dense mouse `rawPath`, and the
 * `brushSize` at commit time. To make global passes (edge flood, hole
 * detection, dark-speck removal) honor the user's corrections, we
 * rasterize each tool's strokes into a footprint mask: 1 wherever the
 * brush passed under that tool, 0 elsewhere.
 *
 * Drawn as filled circles along each path point — the same visual
 * footprint the user saw when stroking. Bresenham-style midpoint
 * circle fill, no canvas API dependency (works in Node/jest too).
 *
 * Returns a fresh Uint8Array sized W*H. Empty (all zeros) if no
 * strokes match `tool`.
 */

// Inlined here so the helper has no Panel.tsx coupling. BrushTool is
// declared as a local type inside Panel.tsx (line ~280); copying the
// union keeps strokeMask.ts free-standing and unit-testable.
type BrushTool = 'keep' | 'remove';

interface StrokeForRaster {
  tool: BrushTool;
  rawPath: Array<{ x: number; y: number }>;
  brushSize: number;
}

/** Bresenham-style filled circle, clipped to image bounds. */
function fillCircle(
  mask: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number
) {
  const r2 = radius * radius;
  const xMin = Math.max(0, Math.floor(cx - radius));
  const xMax = Math.min(width - 1, Math.ceil(cx + radius));
  const yMin = Math.max(0, Math.floor(cy - radius));
  const yMax = Math.min(height - 1, Math.ceil(cy + radius));
  for (let y = yMin; y <= yMax; y++) {
    const dy = y - cy;
    const dy2 = dy * dy;
    for (let x = xMin; x <= xMax; x++) {
      const dx = x - cx;
      if (dx * dx + dy2 <= r2) mask[y * width + x] = 1;
    }
  }
}

export function rasterizeStrokes(
  history: StrokeForRaster[],
  tool: BrushTool,
  width: number,
  height: number
): Uint8Array {
  const mask = new Uint8Array(width * height);
  for (const stroke of history) {
    if (stroke.tool !== tool) continue;
    const r = stroke.brushSize / 2;
    for (const p of stroke.rawPath) {
      fillCircle(mask, width, height, p.x, p.y, r);
    }
  }
  return mask;
}
