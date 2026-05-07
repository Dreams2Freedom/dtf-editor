/**
 * Convert the user's brush history into protect / force-carve masks
 * for the global passes (edge flood, hole detection, dark speck).
 *
 * Phase 2.5 — asymmetric algorithms per brush tool:
 *
 *   Keep stroke (user means "this whole semantic segment is subject"):
 *     - take SAM's predicted mask (the whole segment around the click)
 *     - INTERSECT with NOT-bg-colored, dropping pixels close to the
 *       background color. This way SAM's coarse "subject blob" doesn't
 *       over-protect small bg-colored pockets that happen to sit
 *       inside the segment (the leftover whites between leaves on
 *       the turtle in Phase 2.4 — Edge Flood + Hole Detection were
 *       blocked from carving them by an over-zealous protect mask).
 *     - UNION with the literal brush footprint so the user can always
 *       force a true-bg-colored pixel to stay protected by physically
 *       painting over it.
 *
 *   Remove stroke (user means "this local color-connected area is bg"):
 *     - SAM's prediction is intentionally NOT used. Single negative
 *       SAM prompts have no positive anchor and routinely return
 *       wildly oversized masks (a 5-px Remove click can return a
 *       whole-image bg-ish mask). That was the Phase 2.4 failure
 *       where one tiny click steamrolled the entire prior Keep stroke.
 *     - Instead, seed a local color flood from the brush footprint
 *       through bg-colored neighbors. The flood naturally bounds
 *       itself: it stops at colored subject pixels, so a click on a
 *       small white pocket only carves that local pocket.
 *     - UNION with the literal brush footprint so a stroke always
 *       carves at least the painted area, even on weird inputs where
 *       the flood can't expand.
 *
 * Latest stroke wins per pixel — a later Remove on the same physical
 * region overrides an earlier Keep, and vice versa. (Within Keep, the
 * bg-color subtraction means a Keep stroke only "wins" for pixels that
 * are actually subject-colored, leaving the bg pockets carve-eligible.)
 */

import { rasterizeStrokes } from './strokeMask';
import { floodFromSeeds } from './edgeFlood';

type BrushTool = 'keep' | 'remove';

interface StrokeForSemantics {
  tool: BrushTool;
  rawPath: Array<{ x: number; y: number }>;
  brushSize: number;
  /** SAM's predicted segmentation mask for this stroke. May be empty. */
  samMask: Uint8Array;
}

export interface StrokeRegions {
  /** 1 = Keep wins for this pixel (protected from carving). */
  protect: Uint8Array;
  /** 1 = Remove wins for this pixel (always carved). */
  forceCarve: Uint8Array;
}

export interface StrokeRegionContext {
  /** Original RGBA pixels, used for color-based logic on both sides. */
  data: Uint8ClampedArray;
  /** Detected background color (median of edge BG pixels). */
  bgColor: { r: number; g: number; b: number };
  /** Local-flood tolerance for Remove strokes. Comes from the BG Color
   *  Flood slider × ~1.2 so Remove is slightly more permissive than the
   *  global edge flood (user explicitly said "carve here"). */
  removeFloodTolerance: number;
}

/** Squared distance threshold for the Keep ∩ NOT-bg subtraction.
 *  Tight on purpose — we only want to drop OBVIOUSLY-bg pixels from
 *  the SAM mask, not soak up legitimate light-toned subject pixels. */
const KEEP_BG_SUBTRACT_DISTANCE = 25;
const KEEP_BG_SUBTRACT_TOL_SQ =
  KEEP_BG_SUBTRACT_DISTANCE * KEEP_BG_SUBTRACT_DISTANCE;

function isBgLike(
  data: Uint8ClampedArray,
  i: number,
  bg: { r: number; g: number; b: number }
): boolean {
  const j = i * 4;
  const dr = data[j] - bg.r;
  const dg = data[j + 1] - bg.g;
  const db = data[j + 2] - bg.b;
  return dr * dr + dg * dg + db * db <= KEEP_BG_SUBTRACT_TOL_SQ;
}

export function computeStrokeRegions(
  history: StrokeForSemantics[],
  width: number,
  height: number,
  ctx: StrokeRegionContext
): StrokeRegions {
  const total = width * height;
  const protect = new Uint8Array(total);
  const forceCarve = new Uint8Array(total);

  for (const stroke of history) {
    // Literal brush footprint — always honored regardless of color or
    // SAM prediction. Phase 2.5 floor: even when subtractions / floods
    // produce nothing useful, the painted area is still claimed.
    const footprint = rasterizeStrokes([stroke], stroke.tool, width, height);

    if (stroke.tool === 'keep') {
      // Keep = SAM segment ∩ NOT-bg, UNION footprint.
      for (let i = 0; i < total; i++) {
        const inSam = stroke.samMask[i] === 1;
        const inFootprint = footprint[i] === 1;
        // SAM contribution only counts if the pixel isn't obviously bg
        // (dropping bg pockets sitting inside the SAM blob).
        const samProtect = inSam && !isBgLike(ctx.data, i, ctx.bgColor);
        if (samProtect || inFootprint) {
          protect[i] = 1;
          forceCarve[i] = 0;
        }
      }
    } else {
      // Remove = local color flood from footprint, UNION footprint.
      // Collect seed indices: all pixels under the rasterized stroke.
      const seeds: number[] = [];
      for (let i = 0; i < total; i++) {
        if (footprint[i] === 1) seeds.push(i);
      }
      const flood = floodFromSeeds(ctx.data, width, height, seeds, {
        bgColor: ctx.bgColor,
        sensitivity: ctx.removeFloodTolerance,
      });
      for (let i = 0; i < total; i++) {
        if (flood[i] === 1 || footprint[i] === 1) {
          forceCarve[i] = 1;
          protect[i] = 0;
        }
      }
    }
  }

  return { protect, forceCarve };
}
