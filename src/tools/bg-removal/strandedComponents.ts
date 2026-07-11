/**
 * Stranded-component carving — Phase 2.7.
 *
 * Generalizes the older `darkSpeckRemoval` pass. The size-capped
 * connected-component approach there (carve any dark blob ≤ N px)
 * fails on dense distressed/grunge designs because the noise pixels
 * 4-connect into clusters that exceed the cap.
 *
 * What real BG-removal tools (ClippingMagic Graphics mode, Ninja
 * Transfers, etc.) actually do — and what THIS pass implements — is
 * carve based on isolation, not darkness:
 *
 *   For each foreground connected component below a size threshold,
 *   look at its surroundings. If the dilated bounding box around the
 *   component is mostly transparent already, the component is
 *   "stranded" — it's an unintended speck left behind after the
 *   bg-color passes. Carve it. If the surroundings still contain
 *   significant foreground (e.g., a turtle eye sitting inside the
 *   turtle body), the component is contextually anchored — keep it.
 *
 * Composes cleanly with the existing pipeline:
 *   - Edge Flood handles outer bg.
 *   - Hole Detection handles enclosed bg pockets.
 *   - This pass handles arbitrary-color specks left over INSIDE the
 *     transparent zones those passes created.
 *
 * Color-agnostic: catches dark grunge, mid-tone noise, and rogue
 * foreground islands of any hue. Contrast that with darkSpeckRemoval
 * which was only useful for sub-bg-luminance pixels.
 *
 * Safety nets:
 *   - The single largest foreground component is NEVER carved (so a
 *     small-but-only subject is always preserved — e.g., a 1000-px
 *     logo on a 4MP canvas where the entire subject would otherwise
 *     fall under the size cap).
 *   - Components above the size cap are skipped (real subject features).
 *   - Pixels marked in `protectMask` (Keep brush strokes) are never
 *     carved, even when their component is judged stranded.
 *
 * Sensitivity (0..100):
 *   - sens 0   → no-op early return.
 *   - sens 50  → max component size ~2000 px, transparency threshold 72%.
 *   - sens 100 → max component size ~4000 px, transparency threshold 60%.
 */

export interface StrandedComponentsOptions {
  /** 0..100. 0 = no-op. */
  sensitivity: number;
  /** User "Keep" strokes — never carve protected pixels. */
  protectMask?: Uint8Array | null;
}

const BBOX_MARGIN = 20;

/**
 * Carve isolated foreground components from a binary mask.
 *
 * @returns the same `mask` array (in-place mutation).
 */
export function removeStrandedSpecks(
  mask: Uint8Array,
  width: number,
  height: number,
  opts: StrandedComponentsOptions
): Uint8Array {
  if (opts.sensitivity <= 0) return mask;

  const total = width * height;
  // sens 100 → 4000, 50 → 2000, 25 → 1000, 10 → 400
  const maxComponentSize = Math.round(40 * opts.sensitivity);
  // sens 0 → 0.85, 50 → 0.725, 100 → 0.60. Higher sens = more aggressive
  // (a stranded component with even a thin foreground neighbor still gets carved).
  const transparencyThreshold = 0.85 - opts.sensitivity * 0.0025;
  const protect = opts.protectMask;

  // ── Pass 1: connected-component labeling on foreground mask. Record
  //    each component's size, bbox, and the index list (so we can carve
  //    later without re-running BFS).
  const compId = new Int32Array(total).fill(-1);
  const componentSizes: number[] = [];
  const componentBboxes: Array<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  }> = [];
  const componentIndices: number[][] = [];

  const stack: number[] = [];
  let nextId = 0;
  let largestId = -1;
  let largestSize = 0;

  for (let start = 0; start < total; start++) {
    if (mask[start] !== 1 || compId[start] !== -1) continue;

    const id = nextId++;
    stack.length = 0;
    stack.push(start);
    compId[start] = id;
    const indices: number[] = [];
    const sx = start % width;
    const sy = (start - sx) / width;
    let x0 = sx;
    let x1 = sx;
    let y0 = sy;
    let y1 = sy;

    while (stack.length) {
      const i = stack.pop() as number;
      indices.push(i);
      const x = i % width;
      const y = (i - x) / width;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;

      if (x > 0) {
        const n = i - 1;
        if (mask[n] === 1 && compId[n] === -1) {
          compId[n] = id;
          stack.push(n);
        }
      }
      if (x < width - 1) {
        const n = i + 1;
        if (mask[n] === 1 && compId[n] === -1) {
          compId[n] = id;
          stack.push(n);
        }
      }
      if (y > 0) {
        const n = i - width;
        if (mask[n] === 1 && compId[n] === -1) {
          compId[n] = id;
          stack.push(n);
        }
      }
      if (y < height - 1) {
        const n = i + width;
        if (mask[n] === 1 && compId[n] === -1) {
          compId[n] = id;
          stack.push(n);
        }
      }
    }

    componentSizes.push(indices.length);
    componentBboxes.push({ x0, y0, x1, y1 });
    componentIndices.push(indices);
    if (indices.length > largestSize) {
      largestSize = indices.length;
      largestId = id;
    }
  }

  if (nextId === 0) return mask;

  // ── Pass 2: build summed-area table of transparency (mask=0).
  //    Lets us count transparent pixels in any rect in O(1) per query.
  //    Stride is (width + 1) and rows include a leading zero column,
  //    same for the leading row, so the standard inclusion-exclusion
  //    formula works without bounds checks.
  const sw = width + 1;
  const sh = height + 1;
  const sat = new Uint32Array(sw * sh);
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    const inRowBase = y * width;
    const outRowBase = (y + 1) * sw + 1;
    const aboveRowBase = y * sw + 1;
    for (let x = 0; x < width; x++) {
      rowSum += mask[inRowBase + x] === 0 ? 1 : 0;
      sat[outRowBase + x] = sat[aboveRowBase + x] + rowSum;
    }
  }

  const transparentCountInRect = (
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ): number => {
    // Inclusive coords. Rect area = (x1-x0+1) * (y1-y0+1).
    const a = sat[(y1 + 1) * sw + (x1 + 1)];
    const b = sat[y0 * sw + (x1 + 1)];
    const c = sat[(y1 + 1) * sw + x0];
    const d = sat[y0 * sw + x0];
    return a - b - c + d;
  };

  // ── Pass 3: decide and carve. Skip the single largest component
  //    (always preserve the subject's main mass) and anything above
  //    the size cap. For the rest, compute surrounding transparency
  //    ratio and carve if stranded.
  for (let id = 0; id < nextId; id++) {
    if (id === largestId) continue;
    const size = componentSizes[id];
    if (size > maxComponentSize) continue;

    const { x0, y0, x1, y1 } = componentBboxes[id];
    const bx0 = Math.max(0, x0 - BBOX_MARGIN);
    const by0 = Math.max(0, y0 - BBOX_MARGIN);
    const bx1 = Math.min(width - 1, x1 + BBOX_MARGIN);
    const by1 = Math.min(height - 1, y1 + BBOX_MARGIN);

    const boxArea = (bx1 - bx0 + 1) * (by1 - by0 + 1);
    const transparentInBox = transparentCountInRect(bx0, by0, bx1, by1);
    // Surroundings = box minus the component itself. Dividing by
    // box - size focuses the ratio on what's AROUND the speck, not
    // contaminated by the speck's own footprint.
    const surroundingsArea = boxArea - size;
    if (surroundingsArea <= 0) continue;
    const ratio = transparentInBox / surroundingsArea;

    if (ratio < transparencyThreshold) continue;

    // Carve. Honor protectMask — Keep brush strokes anchor a
    // component to "keep" even if it's surrounded by transparency.
    const indices = componentIndices[id];
    if (protect) {
      // If ANY pixel in the component is protected, the user has
      // expressed intent on it — leave the whole component alone.
      // Conservative but matches the "Keep stroke = whole region
      // protected" semantics elsewhere.
      let anyProtected = false;
      for (let k = 0; k < indices.length; k++) {
        if (protect[indices[k]] === 1) {
          anyProtected = true;
          break;
        }
      }
      if (anyProtected) continue;
    }
    for (let k = 0; k < indices.length; k++) {
      mask[indices[k]] = 0;
    }
  }

  return mask;
}
