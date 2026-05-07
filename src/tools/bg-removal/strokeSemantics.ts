/**
 * Convert the user's brush history into protect / force-carve masks
 * for the global passes (edge flood, hole detection, dark speck).
 *
 * Keep stroke (user means "this whole semantic segment is subject"):
 *   - Start from SAM's predicted mask (the whole segment around the click).
 *   - REFINE by connected-component bg subtraction: among the SAM
 *     pixels that look bg-colored, only the COHERENT pockets (component
 *     size ≥ POCKET_MIN_SIZE) get dropped from protect. Scattered
 *     light-toned subject pixels — single pixels and tiny clusters that
 *     just happen to fall within the bg-color tolerance, common in
 *     watercolor / pastel washes — stay protected. A flat per-pixel
 *     filter alone can't tell a smooth gradient pixel from a real hole;
 *     size filtering can. Same algorithmic shape as holeDetection.ts
 *     and strandedComponents.ts.
 *   - UNION with the literal brush footprint so the user can always
 *     force a true-bg-colored pixel to stay protected by physically
 *     painting over it.
 *
 * Remove stroke (user means "this local color-connected area is bg"):
 *   - SAM's prediction is intentionally NOT used. Single negative
 *     SAM prompts have no positive anchor and routinely return
 *     wildly oversized masks (a 5-px Remove click can return a
 *     whole-image bg-ish mask).
 *   - Instead, seed a local color flood from the brush footprint
 *     through bg-colored neighbors. The flood naturally bounds
 *     itself: it stops at colored subject pixels, so a click on a
 *     small white pocket only carves that local pocket.
 *   - UNION with the literal brush footprint so a stroke always
 *     carves at least the painted area.
 *
 * Latest stroke wins per pixel — a later Remove on the same physical
 * region overrides an earlier Keep, and vice versa.
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

/** Squared distance threshold for the Keep ∩ NOT-bg candidate test.
 *  Tightened from 25 → 18 since the size filter (below) does the heavy
 *  lifting now: the per-pixel test only needs to mark CANDIDATES, the
 *  component-size filter decides what's a real pocket. A tighter
 *  tolerance reduces false-positive members in smooth gradient zones. */
const KEEP_BG_SUBTRACT_DISTANCE = 18;
const KEEP_BG_SUBTRACT_TOL_SQ =
  KEEP_BG_SUBTRACT_DISTANCE * KEEP_BG_SUBTRACT_DISTANCE;

/** Minimum connected-component size (pixels) to count as a real bg
 *  pocket inside the SAM mask. Below this, we treat the cluster as
 *  scattered light-toned subject pixels (e.g., pastel watercolor) and
 *  leave them protected. 80 px ≈ a 9×9 patch — coherent enough to be a
 *  hole, large enough to ignore gradient noise. */
const POCKET_MIN_SIZE = 80;

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

/**
 * Given a SAM mask and the bg-color test, return a Uint8Array where
 * 1 = "this pixel was inside SAM AND looked bg-colored AND belongs to a
 * coherent (≥ POCKET_MIN_SIZE) connected component". These are the
 * pixels we drop from protect — actual bg pockets sitting inside the
 * SAM blob (between-leaves whites, etc.). Scattered candidate pixels
 * stay out of this mask, so they remain protected.
 *
 * 4-connectivity, iterative BFS (no recursion — handles 4K masks).
 */
function findCoherentBgPockets(
  samMask: Uint8Array,
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bg: { r: number; g: number; b: number }
): Uint8Array {
  const total = width * height;
  const candidate = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    if (samMask[i] === 1 && isBgLike(data, i, bg)) candidate[i] = 1;
  }

  const pockets = new Uint8Array(total);
  const visited = new Uint8Array(total);
  const stack: number[] = [];
  const componentIndices: number[] = [];

  for (let start = 0; start < total; start++) {
    if (candidate[start] === 0 || visited[start] === 1) continue;

    componentIndices.length = 0;
    stack.length = 0;
    stack.push(start);
    visited[start] = 1;

    while (stack.length) {
      const i = stack.pop() as number;
      componentIndices.push(i);
      const x = i % width;
      const y = (i - x) / width;
      if (x > 0) {
        const n = i - 1;
        if (candidate[n] === 1 && visited[n] === 0) {
          visited[n] = 1;
          stack.push(n);
        }
      }
      if (x < width - 1) {
        const n = i + 1;
        if (candidate[n] === 1 && visited[n] === 0) {
          visited[n] = 1;
          stack.push(n);
        }
      }
      if (y > 0) {
        const n = i - width;
        if (candidate[n] === 1 && visited[n] === 0) {
          visited[n] = 1;
          stack.push(n);
        }
      }
      if (y < height - 1) {
        const n = i + width;
        if (candidate[n] === 1 && visited[n] === 0) {
          visited[n] = 1;
          stack.push(n);
        }
      }
    }

    if (componentIndices.length >= POCKET_MIN_SIZE) {
      for (let k = 0; k < componentIndices.length; k++) {
        pockets[componentIndices[k]] = 1;
      }
    }
  }

  return pockets;
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
      // Keep = SAM segment minus COHERENT bg pockets, UNION footprint.
      // The pockets mask flags only multi-pixel clusters of bg-like
      // SAM pixels (≥ POCKET_MIN_SIZE). Lone candidate pixels stay
      // protected so smooth pastel gradients don't get riddled with
      // holes by Edge Flood / Hole Detection.
      const pockets = findCoherentBgPockets(
        stroke.samMask,
        ctx.data,
        width,
        height,
        ctx.bgColor
      );
      for (let i = 0; i < total; i++) {
        const inSam = stroke.samMask[i] === 1;
        const inFootprint = footprint[i] === 1;
        const samProtect = inSam && pockets[i] === 0;
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
