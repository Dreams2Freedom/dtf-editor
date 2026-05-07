/**
 * Edge-flood background detection — primary pre-pass for in-house BG Removal.
 *
 * Industry tools (ClippingMagic, Pixcleaner, Remove.bg) don't trust the
 * AI mask alone for background detection. They flood-fill from the
 * image edges through pixels matching the detected background color
 * with a tight tolerance — anything reached is *certainly* background,
 * regardless of whether the AI happened to mark it foreground.
 *
 * That single pass cleanly handles "complex outer contour with internal
 * background pockets connected via narrow gaps" (e.g., the white
 * between flowers in a bouquet illustration). Connected-component hole
 * detection alone can't do that efficiently — it'd need a sensitivity
 * cranked into the aggressive zone where it starts over-carving subject
 * pixels. Edge flood is the right shape for the problem.
 *
 * Sensitivity (0..100) drives the color tolerance:
 *   - tolerance distance ≈ sensitivity * 0.5 (RGB Euclidean)
 *   - sensitivity 0 → no-op early return (algorithm disabled)
 *   - sensitivity 30 → distance 15 (near-pure background only — default)
 *   - sensitivity 60 → distance 30 (near-bg + light off-bg colors)
 *   - sensitivity 100 → distance 50 (catches into mid-grays)
 *
 * Stops at:
 *   - Pixels whose color is outside the tolerance (hits the subject).
 *   - Pixels in `protectMask` (Keep brush strokes — never flood through).
 */

export interface EdgeFloodOptions {
  /** Detected background color in RGB. */
  bgColor: { r: number; g: number; b: number };
  /** 0..100. 0 = no-op. */
  sensitivity: number;
  /** Pixels in this mask act as walls — flood never enters them.
   *  Used to honor user "Keep" strokes so a manually-restored feature
   *  can't be carved back out by the global flood. */
  protectMask?: Uint8Array | null;
}

/**
 * Run the flood and return a binary mask: 1 = certainly background,
 * 0 = unreached (so either subject or trapped inside the subject).
 */
export function edgeFloodBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  opts: EdgeFloodOptions
): Uint8Array {
  const total = width * height;
  const reached = new Uint8Array(total);
  if (opts.sensitivity <= 0) return reached;

  const tolDistance = opts.sensitivity * 0.5;
  const tolSq = tolDistance * tolDistance;
  const { r: br, g: bg, b: bb } = opts.bgColor;
  const protect = opts.protectMask;

  const matches = (i: number) => {
    if (protect && protect[i] === 1) return false;
    const j = i * 4;
    const dr = data[j] - br;
    const dg = data[j + 1] - bg;
    const db = data[j + 2] - bb;
    return dr * dr + dg * dg + db * db <= tolSq;
  };

  // Iterative BFS using a flat number stack (no recursion — handles
  // 4K images without blowing the call stack).
  const stack: number[] = [];

  // Seed every border pixel that matches.
  for (let x = 0; x < width; x++) {
    const top = x;
    const bot = (height - 1) * width + x;
    if (matches(top)) {
      reached[top] = 1;
      stack.push(top);
    }
    if (matches(bot)) {
      reached[bot] = 1;
      stack.push(bot);
    }
  }
  for (let y = 0; y < height; y++) {
    const left = y * width;
    const right = left + (width - 1);
    if (matches(left)) {
      reached[left] = 1;
      stack.push(left);
    }
    if (matches(right)) {
      reached[right] = 1;
      stack.push(right);
    }
  }

  while (stack.length) {
    const i = stack.pop() as number;
    const x = i % width;
    const y = (i - x) / width;
    if (x > 0) {
      const n = i - 1;
      if (!reached[n] && matches(n)) {
        reached[n] = 1;
        stack.push(n);
      }
    }
    if (x < width - 1) {
      const n = i + 1;
      if (!reached[n] && matches(n)) {
        reached[n] = 1;
        stack.push(n);
      }
    }
    if (y > 0) {
      const n = i - width;
      if (!reached[n] && matches(n)) {
        reached[n] = 1;
        stack.push(n);
      }
    }
    if (y < height - 1) {
      const n = i + width;
      if (!reached[n] && matches(n)) {
        reached[n] = 1;
        stack.push(n);
      }
    }
  }

  return reached;
}

/** Auto-detect background color from edge pixels, weighted by mask=0
 *  (where the AI says it's background). Median per channel — robust to
 *  a single bright outlier in a corner. */
export function detectBgColorFromEdges(
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

  if (reds.length === 0) return { r: 255, g: 255, b: 255 };

  const median = (arr: number[]) => {
    arr.sort((a, b) => a - b);
    return arr[arr.length >> 1];
  };
  return { r: median(reds), g: median(greens), b: median(blues) };
}
