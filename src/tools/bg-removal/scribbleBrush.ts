/**
 * Client-side edge-aware "scribble" brush — the ClippingMagic-style
 * interaction engine.
 *
 * The old brush sent the stroke to a server SAM model, which selected a
 * whole semantic object (one dot could remove a huge region). This replaces
 * that with a local, edge-aware region grow over the ORIGINAL pixels:
 *
 *   - The stroke seeds a flood that grows outward from where you painted.
 *   - Growth STOPS at real image edges (a large local color gradient) and
 *     stays within a color-similarity band of the seed color.
 *   - Growth is bounded spatially by the brush size (reach), so a small
 *     brush stays local and a large brush travels farther.
 *
 * The result snaps to the nearest real boundary — paint a rough line inside
 * the anchor's hole and it fills to the metal edge and stops, instead of
 * either erasing one pixel or grabbing the whole top of the anchor.
 *
 * Everything runs in-memory on typed arrays, so there is no server round-trip
 * and no model cold-start.
 */

export interface ScribbleGrowOptions {
  /** Max BFS (graph) distance from any seed, in pixels. Driven by brush size. */
  reachRadius: number;
  /** Per-step color distance (Euclidean RGB) that counts as an edge → stop. */
  edgeThreshold: number;
  /** Max color distance (Euclidean RGB) from the seed mean color → stop. */
  colorTolerance: number;
}

/**
 * Rasterize a freehand stroke path into a set of seed pixel indices by
 * stamping a small filled disc at each path point. A solid seed footprint
 * (rather than a 1px line) gives the region grow a stable starting color
 * sample and avoids single-pixel gaps on fast strokes.
 */
export function strokeToSeeds(
  path: Array<{ x: number; y: number }>,
  seedRadius: number,
  width: number,
  height: number
): number[] {
  const r = Math.max(0, Math.round(seedRadius));
  const r2 = r * r;
  const seen = new Uint8Array(width * height);
  const seeds: number[] = [];
  const stamp = (cx: number, cy: number) => {
    const px = Math.round(cx);
    const py = Math.round(cy);
    const minX = Math.max(0, px - r);
    const maxX = Math.min(width - 1, px + r);
    const minY = Math.max(0, py - r);
    const maxY = Math.min(height - 1, py + r);
    for (let y = minY; y <= maxY; y++) {
      const dy = y - py;
      const rowBase = y * width;
      for (let x = minX; x <= maxX; x++) {
        const dx = x - px;
        if (dx * dx + dy * dy > r2) continue;
        const idx = rowBase + x;
        if (seen[idx]) continue;
        seen[idx] = 1;
        seeds.push(idx);
      }
    }
  };
  for (const p of path) stamp(p.x, p.y);
  return seeds;
}

/**
 * Edge-aware region grow from the given seed pixels. Returns a binary mask
 * (1 byte/pixel, 1 = inside the grown region).
 *
 * Multi-source BFS: all seeds start at depth 0; a neighbor joins the region
 * only if (a) it's within `reachRadius` steps of a seed, (b) the local
 * gradient to it is below `edgeThreshold` (don't cross a real edge), and
 * (c) its color is within `colorTolerance` of the seed mean (don't drift
 * across a gradient into a different region). 4-connected, iterative — safe
 * for large (4K) images.
 */
export function growRegionFromStroke(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  seeds: number[],
  opts: ScribbleGrowOptions
): Uint8Array {
  const total = width * height;
  const region = new Uint8Array(total);
  if (seeds.length === 0) return region;

  // Seed mean color — the appearance model the grow is anchored to.
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  for (const idx of seeds) {
    const j = idx * 4;
    sumR += data[j];
    sumG += data[j + 1];
    sumB += data[j + 2];
  }
  const n = seeds.length;
  const meanR = sumR / n;
  const meanG = sumG / n;
  const meanB = sumB / n;

  const edgeSq = opts.edgeThreshold * opts.edgeThreshold;
  const tolSq = opts.colorTolerance * opts.colorTolerance;
  const maxDepth = Math.max(1, Math.round(opts.reachRadius));

  const depth = new Int32Array(total).fill(-1);
  // Each pixel is enqueued at most once, so a plain typed-array queue of
  // length `total` never overflows.
  const queue = new Uint32Array(total);
  let head = 0;
  let tail = 0;

  for (const idx of seeds) {
    if (idx >= 0 && idx < total && depth[idx] === -1) {
      depth[idx] = 0;
      region[idx] = 1;
      queue[tail++] = idx;
    }
  }

  while (head < tail) {
    const i = queue[head++];
    const d = depth[i];
    if (d >= maxDepth) continue;
    const x = i % width;
    const y = (i - x) / width;
    const ji = i * 4;
    const ir = data[ji];
    const ig = data[ji + 1];
    const ib = data[ji + 2];
    const nd = d + 1;

    const visit = (nIdx: number) => {
      if (depth[nIdx] !== -1) return;
      const jn = nIdx * 4;
      const nr = data[jn];
      const ng = data[jn + 1];
      const nb = data[jn + 2];
      // Edge (local gradient) gate — stop at real boundaries.
      const gr = nr - ir;
      const gg = ng - ig;
      const gb = nb - ib;
      if (gr * gr + gg * gg + gb * gb > edgeSq) return;
      // Color-to-seed gate — don't drift across a gradient.
      const cr = nr - meanR;
      const cg = ng - meanG;
      const cb = nb - meanB;
      if (cr * cr + cg * cg + cb * cb > tolSq) return;
      depth[nIdx] = nd;
      region[nIdx] = 1;
      queue[tail++] = nIdx;
    };

    if (x > 0) visit(i - 1);
    if (x < width - 1) visit(i + 1);
    if (y > 0) visit(i - width);
    if (y < height - 1) visit(i + width);
  }

  return region;
}

/**
 * Median colour of the image border pixels — a robust estimate of the
 * background/garment colour for the connectivity fill, independent of any AI
 * mask. Samples up to ~400 perimeter pixels.
 */
export function detectBorderColor(
  data: Uint8ClampedArray,
  width: number,
  height: number
): { r: number; g: number; b: number } {
  const reds: number[] = [];
  const greens: number[] = [];
  const blues: number[] = [];
  const perimeter = 2 * width + 2 * height;
  const stride = Math.max(1, Math.floor(perimeter / 400));
  const sample = (x: number, y: number) => {
    const j = (y * width + x) * 4;
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
  const median = (arr: number[]) => {
    if (arr.length === 0) return 0;
    arr.sort((a, b) => a - b);
    return arr[arr.length >> 1];
  };
  return { r: median(reds), g: median(greens), b: median(blues) };
}

/**
 * Background = pixels within `tolerance` (Euclidean RGB) of the border colour
 * AND connected to the image border through such pixels. Everything else —
 * including interior detail the SAME colour as the background but ENCLOSED by
 * the subject (hatch lines, eye sockets, the counters of letters) — is
 * foreground. Returns a mask: 1 = background-connected, 0 = foreground.
 *
 * This is what lets a "fill" brush flood across a subject's internal line-work
 * (which shares the background colour) instead of getting trapped by it: the
 * subject is one solid foreground blob, the background is one blob, and a
 * single stroke selects the whole thing.
 */
export function computeBackgroundMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bg: { r: number; g: number; b: number },
  tolerance: number
): Uint8Array {
  const total = width * height;
  const bgMask = new Uint8Array(total);
  const tolSq = tolerance * tolerance;
  const isBg = (i: number) => {
    const j = i * 4;
    const dr = data[j] - bg.r;
    const dg = data[j + 1] - bg.g;
    const db = data[j + 2] - bg.b;
    return dr * dr + dg * dg + db * db <= tolSq;
  };
  const queue = new Uint32Array(total);
  let head = 0;
  let tail = 0;
  const push = (i: number) => {
    if (!bgMask[i] && isBg(i)) {
      bgMask[i] = 1;
      queue[tail++] = i;
    }
  };
  for (let x = 0; x < width; x++) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    push(y * width);
    push(y * width + width - 1);
  }
  while (head < tail) {
    const i = queue[head++];
    const x = i % width;
    const y = (i - x) / width;
    if (x > 0) push(i - 1);
    if (x < width - 1) push(i + 1);
    if (y > 0) push(i - width);
    if (y < height - 1) push(i + width);
  }
  return bgMask;
}

/**
 * Flood a connected region from the stroke seeds through pixels where
 * `mask[i] === passValue`, bounded by `reachRadius` BFS steps (Infinity =
 * fill the whole connected component). Used by the big "fill" brush:
 *   - Keep  → passValue 0 over the background mask (fills the foreground shape).
 *   - Remove→ passValue 1 over the background mask (fills the background area).
 * Returns a binary region mask (1 = selected).
 */
export function fillConnectedRegion(
  mask: Uint8Array,
  passValue: 0 | 1,
  width: number,
  height: number,
  seeds: number[],
  reachRadius: number
): Uint8Array {
  const total = width * height;
  const region = new Uint8Array(total);
  if (seeds.length === 0) return region;
  const depth = new Int32Array(total).fill(-1);
  const queue = new Uint32Array(total);
  let head = 0;
  let tail = 0;
  const maxDepth =
    reachRadius === Infinity ? Infinity : Math.max(1, Math.round(reachRadius));
  for (const s of seeds) {
    if (s >= 0 && s < total && depth[s] === -1 && mask[s] === passValue) {
      depth[s] = 0;
      region[s] = 1;
      queue[tail++] = s;
    }
  }
  while (head < tail) {
    const i = queue[head++];
    const d = depth[i];
    if (d >= maxDepth) continue;
    const x = i % width;
    const y = (i - x) / width;
    const nd = d + 1;
    const visit = (nIdx: number) => {
      if (depth[nIdx] !== -1 || mask[nIdx] !== passValue) return;
      depth[nIdx] = nd;
      region[nIdx] = 1;
      queue[tail++] = nIdx;
    };
    if (x > 0) visit(i - 1);
    if (x < width - 1) visit(i + 1);
    if (y > 0) visit(i - width);
    if (y < height - 1) visit(i + width);
  }
  return region;
}

/**
 * Feather a binary mask into a soft 0-255 alpha coverage map via a separable
 * box blur. Interior stays 255 and exterior stays 0; only the boundary gets a
 * ramp, giving anti-aliased cutout edges instead of a hard 0/255 stairstep.
 * O(width·height) regardless of radius (sliding-window accumulator).
 */
export function featherAlpha(
  mask: Uint8Array,
  width: number,
  height: number,
  radius: number
): Uint8Array {
  const total = width * height;
  const r = Math.max(1, Math.round(radius));
  const win = r * 2 + 1;

  const src = new Float32Array(total);
  for (let i = 0; i < total; i++) src[i] = mask[i] ? 255 : 0;

  // Horizontal pass.
  const tmp = new Float32Array(total);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let acc = 0;
    for (let k = -r; k <= r; k++) {
      const xx = Math.min(width - 1, Math.max(0, k));
      acc += src[row + xx];
    }
    for (let x = 0; x < width; x++) {
      tmp[row + x] = acc / win;
      const xOut = Math.min(width - 1, Math.max(0, x - r));
      const xIn = Math.min(width - 1, Math.max(0, x + r + 1));
      acc += src[row + xIn] - src[row + xOut];
    }
  }

  // Vertical pass.
  const out = new Uint8Array(total);
  for (let x = 0; x < width; x++) {
    let acc = 0;
    for (let k = -r; k <= r; k++) {
      const yy = Math.min(height - 1, Math.max(0, k));
      acc += tmp[yy * width + x];
    }
    for (let y = 0; y < height; y++) {
      out[y * width + x] = Math.round(acc / win);
      const yOut = Math.min(height - 1, Math.max(0, y - r));
      const yIn = Math.min(height - 1, Math.max(0, y + r + 1));
      acc += tmp[yIn * width + x] - tmp[yOut * width + x];
    }
  }

  return out;
}
