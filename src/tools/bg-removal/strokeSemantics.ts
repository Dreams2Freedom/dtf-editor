/**
 * Convert the user's brush history into SAM-aware protect / force-carve
 * masks for the global passes (edge flood, hole detection, dark speck).
 *
 * The point of this helper is that a brush stroke is a semantic
 * selection of an entire region, not a per-pixel paint. When the user
 * paints Keep across a flower petal, SAM has already segmented the
 * whole petal as one region — we want the global passes to honor THAT
 * whole region, not just the strip the brush physically covered.
 *
 * Inputs:
 *   - history: ordered list of strokes. Each carries the SAM-predicted
 *     mask for that click (`samMask`) plus the literal brush trail
 *     (`rawPath` + `brushSize`).
 *
 * Outputs:
 *   - protect    1 = a Keep stroke claimed this pixel; never carve
 *   - forceCarve 1 = a Remove stroke claimed this pixel; always carve
 *
 * Conflict resolution: latest stroke wins per pixel. If the user paints
 * Keep on a region then later Remove on the same region, the region
 * ends up in `forceCarve`. Walking the history in commit order and
 * letting each stroke overwrite the per-pixel state of the previous
 * one gives this for free.
 *
 * The literal brush footprint is unioned with the SAM mask before the
 * stroke is "applied" so the user always gets at least the painted
 * area protected/carved — useful when SAM's prediction is empty or
 * surprisingly small for a given click.
 */

import { rasterizeStrokes } from './strokeMask';

type BrushTool = 'keep' | 'remove';

interface StrokeForSemantics {
  tool: BrushTool;
  rawPath: Array<{ x: number; y: number }>;
  brushSize: number;
  /** SAM's predicted segmentation mask for this stroke. May be empty
   *  if the prediction failed or returned nothing useful. */
  samMask: Uint8Array;
}

export interface StrokeRegions {
  /** 1 = Keep wins for this pixel (protected from carving). */
  protect: Uint8Array;
  /** 1 = Remove wins for this pixel (always carved). */
  forceCarve: Uint8Array;
}

export function computeStrokeRegions(
  history: StrokeForSemantics[],
  width: number,
  height: number
): StrokeRegions {
  const total = width * height;
  const protect = new Uint8Array(total);
  const forceCarve = new Uint8Array(total);

  for (const stroke of history) {
    // Literal brush footprint along the path. Acts as a safety floor
    // — a stroke always claims at least the pixels physically painted,
    // even if SAM returned nothing.
    const footprint = rasterizeStrokes([stroke], stroke.tool, width, height);

    // The semantic region this stroke selected = SAM prediction ∪ footprint.
    if (stroke.tool === 'keep') {
      for (let i = 0; i < total; i++) {
        if (stroke.samMask[i] === 1 || footprint[i] === 1) {
          protect[i] = 1;
          forceCarve[i] = 0;
        }
      }
    } else {
      for (let i = 0; i < total; i++) {
        if (stroke.samMask[i] === 1 || footprint[i] === 1) {
          forceCarve[i] = 1;
          protect[i] = 0;
        }
      }
    }
  }

  return { protect, forceCarve };
}
