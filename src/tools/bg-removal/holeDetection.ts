/**
 * Internal hole detection post-pass for the in-house BG Removal tool.
 *
 * Foreground-segmentation models produce a single connected mask and
 * never carve out background-colored regions trapped inside the
 * foreground (insides of letters, gaps between flowers in a bouquet,
 * etc.). This post-pass closes that gap.
 *
 * Algorithm (sensitivity > 0):
 *
 *   1. Auto-detect background color from edge pixels where the AI mask
 *      says background (median R, G, B is robust to outliers).
 *   2. Build `isBgColor[i]`: 1 where pixel color is within a TIGHT,
 *      sensitivity-tuned tolerance of the background, else 0.
 *      (Older versions used a way-too-generous tolerance — half the RGB
 *       cube at sensitivity 70 — which over-carved subject features.)
 *   3. Find connected components of (mask=1 AND isBgColor=1) candidate
 *      pixels via iterative BFS (4-connectivity).
 *   4. Carve every component whose pixel count ≥ a sensitivity-scaled
 *      MIN_BLOB_SIZE. Smaller blobs are presumed to be subject features
 *      (a tiny white sparkle inside a flower) and left alone.
 *
 * The previous "flood-fill from edges and only carve unreached pixels"
 * approach failed on the turtle bouquet: white between flowers
 * connects via narrow BG-colored gaps to the outside, gets marked
 * "external," then the carve rule skips it. Connected-component +
 * size filter handles both enclosed AND outside-connected internal
 * background-colored regions correctly.
 *
 * Sensitivity (extended in Phase 2.2 to 0..200) drives BOTH knobs in tandem:
 *   - color tolerance:  tolDistance = sensitivity * 0.5
 *                       (at 100 → ~50 distance, at 200 → ~100, catches grays)
 *   - min blob size:    minSize = max(5, 200 - sensitivity * 2)
 *                       (at 100 → 20 px, at 200 → 5 px, very aggressive)
 *
 * The 0..100 range is the "normal" operating zone (catches near-pure
 * background); 100..200 is the "aggressive" zone where the tolerance
 * widens into mid-grays and even single-pixel pockets get carved.
 *
 * Aggressive when the user wants it; the Keep brush is the safety net
 * for legitimate features that get carved (paint them back).
 */

function detectBackgroundColor(
  data: Uint8ClampedArray,
  mask: Uint8Array,
  width: number,
  height: number
): { r: number; g: number; b: number } {
  const reds: number[] = [];
  const greens: number[] = [];
  const blues: number[] = [];

  const perimeter = 2 * width + 2 * height;
  const stride = Math.max(1, Math.floor(perimeter / 400));

  const sample = (x: number, y: number) => {
    const i = y * width + x;
    if (mask[i] !== 0) return;
    const j = i * 4;
    reds.push(data[j]);
    greens.push(data[j + 1]);
    blues.push(data[j + 2]);
  };

  for (let x = 0; x < width; x += stride) {
    sample(x, 0);
    sample(x, height - 1);
  }
  for (let y = 0; y < height; y += stride) {
    sample(0, y);
    sample(width - 1, y);
  }

  if (reds.length === 0) {
    return { r: 255, g: 255, b: 255 };
  }

  const median = (arr: number[]) => {
    arr.sort((a, b) => a - b);
    return arr[arr.length >> 1];
  };

  return { r: median(reds), g: median(greens), b: median(blues) };
}

/**
 * Carve internal holes from a foreground mask.
 *
 * @param mask          binary Uint8Array, 1 = foreground, 0 = background. Mutated.
 * @param data          original RGBA pixels (ImageData.data).
 * @param width
 * @param height
 * @param sensitivity   0..200. 0 = no-op early return.
 * @param protectMask   optional Uint8Array — pixels marked 1 here are
 *                      treated as "user said keep" and never carved.
 * @param forceCarveMask optional Uint8Array — pixels marked 1 here are
 *                      always carved regardless of color (user "Remove"
 *                      strokes).
 *
 * @returns the same `mask` array (in-place mutation).
 */
export function detectInternalHoles(
  mask: Uint8Array,
  data: Uint8ClampedArray,
  width: number,
  height: number,
  sensitivity: number,
  protectMask?: Uint8Array | null,
  forceCarveMask?: Uint8Array | null
): Uint8Array {
  // First: apply user "Remove" strokes — those carve regardless of
  // anything else (color, sensitivity, enclosure).
  if (forceCarveMask) {
    for (let i = 0; i < mask.length; i++) {
      if (forceCarveMask[i] === 1) mask[i] = 0;
    }
  }

  if (sensitivity <= 0) return mask;

  const bg = detectBackgroundColor(data, mask, width, height);

  const tolDistance = sensitivity * 0.5; // 100 → 50, 200 → 100, 50 → 25
  const tolSq = tolDistance * tolDistance;

  // Inversely scale the min-blob threshold: high sensitivity → carve
  // small blobs too; low sensitivity → only big obvious holes.
  // Floor at 5 px so 100..200 still keeps some noise protection.
  const minBlobSize = Math.max(5, 200 - sensitivity * 2);

  const total = width * height;
  const isCandidate = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    if (mask[i] !== 1) continue;
    if (protectMask && protectMask[i] === 1) continue; // user said keep
    const j = i * 4;
    const dr = data[j] - bg.r;
    const dg = data[j + 1] - bg.g;
    const db = data[j + 2] - bg.b;
    if (dr * dr + dg * dg + db * db <= tolSq) isCandidate[i] = 1;
  }

  // Connected-component labeling (iterative BFS, 4-connectivity).
  // For each component, count size first; if it qualifies, carve in a
  // second pass over the same indices.
  const visited = new Uint8Array(total);
  const queue: number[] = [];
  const componentIndices: number[] = [];

  for (let start = 0; start < total; start++) {
    if (isCandidate[start] === 0 || visited[start] === 1) continue;

    // BFS from `start` collecting all connected candidate pixels.
    componentIndices.length = 0;
    queue.length = 0;
    queue.push(start);
    visited[start] = 1;

    while (queue.length) {
      const i = queue.pop() as number;
      componentIndices.push(i);
      const x = i % width;
      const y = (i - x) / width;
      // 4-connectivity neighbors.
      if (x > 0) {
        const n = i - 1;
        if (isCandidate[n] === 1 && visited[n] === 0) {
          visited[n] = 1;
          queue.push(n);
        }
      }
      if (x < width - 1) {
        const n = i + 1;
        if (isCandidate[n] === 1 && visited[n] === 0) {
          visited[n] = 1;
          queue.push(n);
        }
      }
      if (y > 0) {
        const n = i - width;
        if (isCandidate[n] === 1 && visited[n] === 0) {
          visited[n] = 1;
          queue.push(n);
        }
      }
      if (y < height - 1) {
        const n = i + width;
        if (isCandidate[n] === 1 && visited[n] === 0) {
          visited[n] = 1;
          queue.push(n);
        }
      }
    }

    // Carve only blobs above the size threshold. Small blobs are
    // presumed to be legitimate subject features (sparkles, dots).
    if (componentIndices.length >= minBlobSize) {
      for (let k = 0; k < componentIndices.length; k++) {
        mask[componentIndices[k]] = 0;
      }
    }
  }

  return mask;
}
