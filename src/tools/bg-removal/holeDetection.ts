/**
 * Internal hole detection post-pass for the in-house BG Removal tool.
 *
 * Foreground-segmentation models (BRIA-rmbg, BiRefNet variants, U2Net,
 * isnet-anime) all produce a single connected mask — they nail the
 * outer contour but never carve out background-colored regions trapped
 * inside the foreground (the inside of an "O", gaps between turtle
 * features, etc.). ClippingMagic catches those because it runs an
 * explicit second pass after segmentation; this is ours.
 *
 * Algorithm (sensitivity > 0):
 *
 *   1. Auto-detect background color from edge pixels where the AI
 *      mask says background. Median R, G, B is robust to a single
 *      bright outlier in the corner.
 *   2. Build `isBgColor[i]`: 1 where pixel color is within a
 *      sensitivity-tuned tolerance of the background color, else 0.
 *   3. Iterative flood-fill from every image-border pixel through
 *      pixels where (mask=0 OR isBgColor=1). Anything reached is
 *      "external" — connected to the outside via a BG path.
 *   4. Carve: for each pixel where mask=1 AND isBgColor=1 AND NOT
 *      reachable, flip mask to 0. These are BG-colored pixels the AI
 *      left as foreground but that are trapped inside the subject —
 *      i.e., the holes.
 *
 * Aggressive by default. The Keep brush is the safety net for false
 * positives (a real white feature accidentally carved out can be
 * painted back).
 */

/** Sample edge pixels of the original image where the AI mask says
 *  background, take the per-channel median. Falls back to white (255s)
 *  if no edge background pixels exist (very rare — image entirely
 *  full-bleed). */
function detectBackgroundColor(
  data: Uint8ClampedArray,
  mask: Uint8Array,
  width: number,
  height: number
): { r: number; g: number; b: number } {
  const reds: number[] = [];
  const greens: number[] = [];
  const blues: number[] = [];

  // Sample stride: ~1% of perimeter, capped to avoid degenerate cases.
  const perimeter = 2 * width + 2 * height;
  const stride = Math.max(1, Math.floor(perimeter / 400));

  const sample = (x: number, y: number) => {
    const i = y * width + x;
    if (mask[i] !== 0) return; // skip foreground edge pixels
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
 * @param mask        binary Uint8Array, 1 = foreground, 0 = background. Mutated.
 * @param data        original RGBA pixels (ImageData.data).
 * @param width
 * @param height
 * @param sensitivity 0..100. 0 = no-op. Higher = wider color tolerance.
 *
 * @returns the same `mask` array (in-place mutation).
 */
export function detectInternalHoles(
  mask: Uint8Array,
  data: Uint8ClampedArray,
  width: number,
  height: number,
  sensitivity: number
): Uint8Array {
  if (sensitivity <= 0) return mask;

  const bg = detectBackgroundColor(data, mask, width, height);

  // sensitivity 0..100 → squared distance threshold ~0..40000.
  // 70 → ~16k (≈ 127 px Euclidean); 100 → ~40k (≈ 200).
  const tol = sensitivity * 4;
  const tolSq = tol * tol;

  const total = width * height;
  const isBgColor = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    const j = i * 4;
    const dr = data[j] - bg.r;
    const dg = data[j + 1] - bg.g;
    const db = data[j + 2] - bg.b;
    if (dr * dr + dg * dg + db * db <= tolSq) isBgColor[i] = 1;
  }

  // Flood-fill from every border pixel through (mask=0 OR isBgColor=1).
  // Iterative queue, no recursion — handles 4K images without stack overflow.
  const reachable = new Uint8Array(total);
  const queue: number[] = [];

  const seed = (i: number) => {
    if (reachable[i]) return;
    if (mask[i] === 0 || isBgColor[i] === 1) {
      reachable[i] = 1;
      queue.push(i);
    }
  };

  for (let x = 0; x < width; x++) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    seed(y * width);
    seed(y * width + (width - 1));
  }

  while (queue.length) {
    const i = queue.pop() as number;
    const x = i % width;
    const y = (i - x) / width;
    if (x > 0) seed(i - 1);
    if (x < width - 1) seed(i + 1);
    if (y > 0) seed(i - width);
    if (y < height - 1) seed(i + width);
  }

  // Carve: foreground pixels that are BG-colored AND not reachable
  // from outside via a BG path are trapped holes — flip them.
  for (let i = 0; i < total; i++) {
    if (mask[i] === 1 && isBgColor[i] === 1 && !reachable[i]) {
      mask[i] = 0;
    }
  }

  return mask;
}
