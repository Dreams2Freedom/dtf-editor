/**
 * Shared client-side edge-aware "scribble" brush geometry — the FULL engine.
 *
 * These are the PURE functions behind the ClippingMagic-style refine brush:
 * no DOM, no network, no session — just typed-array math over image pixels.
 * They live under `src/lib` (not inside a tool folder) so the cross-origin
 * Partner embed can share them without tripping the tool-folder import
 * firewall (see eslint.config.mjs) and WITHOUT importing or altering the
 * consumer DTF Editor tools.
 *
 * This is a faithful, additive COPY of the real brush engine in
 * `src/tools/bg-removal/scribbleBrush.ts`. The consumer file is deliberately
 * left untouched — the embed reuses the same algorithms so its brush behaves
 * like the real DTF Editor brush, but the two never share a runtime import.
 * Keep the two in sync when the engine is tuned.
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
 * stamping a small filled disc at each path point.
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
 * (1 byte/pixel, 1 = inside the grown region). Multi-source BFS bounded by
 * reachRadius, stopping at edges (edgeThreshold) and staying within a colour
 * band of the seed mean (colorTolerance). 4-connected, iterative.
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
      const gr = nr - ir;
      const gg = ng - ig;
      const gb = nb - ib;
      if (gr * gr + gg * gg + gb * gb > edgeSq) return;
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
 * background/garment colour for the connectivity fill. Samples ~400 perimeter
 * pixels.
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
 * Background = pixels within `tolerance` of the border colour AND connected to
 * the image border through such pixels. Everything else — including interior
 * detail the same colour as the background but enclosed by the subject — is
 * foreground. Returns a mask: 1 = background-connected, 0 = foreground.
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
 * Dilate a binary mask by `radius` px (4-connected, iterative). Seals hairline
 * gaps in a design's outline so a background flood can't sneak inside.
 */
function dilateMask(
  mask: Uint8Array,
  width: number,
  height: number,
  radius: number
): Uint8Array {
  let a = mask;
  for (let it = 0; it < radius; it++) {
    const b = Uint8Array.from(a);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (a[i]) continue;
        if (
          (x > 0 && a[i - 1]) ||
          (x < width - 1 && a[i + 1]) ||
          (y > 0 && a[i - width]) ||
          (y < height - 1 && a[i + width])
        ) {
          b[i] = 1;
        }
      }
    }
    a = b;
  }
  return a;
}

/**
 * Colour-aware defringe. Peels background-coloured pixels off the OUTER
 * boundary of a keep mask, inward up to `maxPx`, stopping at real design
 * colour. Removes the halo the gap-sealing dilation leaves without eroding
 * real content or touching enclosed interior regions.
 */
export function defringeBackgroundFringe(
  mask: Uint8Array,
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bg: { r: number; g: number; b: number },
  tolerance: number,
  maxPx: number
): Uint8Array {
  if (maxPx <= 0) return mask;
  const tolSq = tolerance * tolerance;
  const isBg = (i: number) => {
    const j = i * 4;
    const dr = data[j] - bg.r;
    const dg = data[j + 1] - bg.g;
    const db = data[j + 2] - bg.b;
    return dr * dr + dg * dg + db * db <= tolSq;
  };
  let a: Uint8Array = Uint8Array.from(mask);
  for (let pass = 0; pass < maxPx; pass++) {
    const b = Uint8Array.from(a);
    let changed = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (!a[i]) continue;
        const edge =
          (x > 0 && !a[i - 1]) ||
          (x < width - 1 && !a[i + 1]) ||
          (y > 0 && !a[i - width]) ||
          (y < height - 1 && !a[i + width]);
        if (edge && isBg(i)) {
          b[i] = 0;
          changed++;
        }
      }
    }
    a = b;
    if (!changed) break;
  }
  return a;
}

/**
 * "Keep whole shape" — a cutout that removes ONLY the true exterior background
 * and keeps the entire design silhouette solid (all interior detail, including
 * parts the same colour as the background). Returns a foreground mask:
 * 1 = keep, 0 = background.
 */
export function computeWholeShapeMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bg: { r: number; g: number; b: number },
  colorTolerance: number,
  sealRadius: number,
  defringePx: number = 0
): Uint8Array {
  const total = width * height;
  const tolSq = colorTolerance * colorTolerance;

  let barrier: Uint8Array = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    const j = i * 4;
    const dr = data[j] - bg.r;
    const dg = data[j + 1] - bg.g;
    const db = data[j + 2] - bg.b;
    barrier[i] = dr * dr + dg * dg + db * db <= tolSq ? 0 : 1;
  }
  if (sealRadius > 0) barrier = dilateMask(barrier, width, height, sealRadius);

  const exterior = new Uint8Array(total);
  const queue = new Uint32Array(total);
  let head = 0;
  let tail = 0;
  const push = (i: number) => {
    if (!exterior[i] && !barrier[i]) {
      exterior[i] = 1;
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

  const keep = new Uint8Array(total);
  for (let i = 0; i < total; i++) keep[i] = exterior[i] ? 0 : 1;

  if (defringePx > 0) {
    return defringeBackgroundFringe(
      keep,
      data,
      width,
      height,
      bg,
      colorTolerance + 40,
      defringePx
    );
  }
  return keep;
}

/**
 * Flood a connected region from the stroke seeds through pixels where
 * `mask[i] === passValue`, bounded by `reachRadius` BFS steps (Infinity =
 * whole connected component). The big "fill" brush:
 *   - Keep  → passValue 0 over the background mask (fills the foreground shape).
 *   - Remove→ passValue 1 over the background mask (fills the background area).
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
 * box blur. Interior stays 255, exterior 0; only the boundary gets a ramp.
 * O(width·height) regardless of radius.
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
