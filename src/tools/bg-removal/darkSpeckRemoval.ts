/**
 * Dark-speck removal — inverse of internal hole detection.
 *
 * Hole Detection targets bg-COLORED pixels trapped inside the subject.
 * That handles the inside-of-O / between-flowers cases where pure
 * white is supposed to be transparent.
 *
 * But some designs (TOP DAD's distressed grunge, halftone-style
 * artwork on a light background) leave behind small DARK speckles
 * inside what's now a white-rimmed letter shape — those don't share
 * the BG color so Hole Detection categorically can't touch them.
 *
 * This pass is the symmetric companion: find small connected
 * components of FOREGROUND pixels whose color is significantly DARKER
 * than the detected background, and carve them. Only triggers on
 * components below a sensitivity-tuned size cap so we don't punch out
 * legitimate dark subject features (turtle eyes, signature lines,
 * etc.).
 *
 * Off by default — only useful for grunge/distressed designs.
 */

export interface DarkSpeckOptions {
  /** Detected background color RGB (use detectBgColorFromEdges). */
  bgColor: { r: number; g: number; b: number };
  /** 0..100. 0 = no-op. Higher = larger speck cap + wider darkness band. */
  sensitivity: number;
  /** User "Keep" strokes — never carve protected pixels. */
  protectMask?: Uint8Array | null;
}

/**
 * Carve dark specks from a foreground mask.
 *
 * Picks pixels currently in foreground whose color is "significantly
 * darker" than the detected background (luminance gap > threshold).
 * Connected-components them, carves only components ≤ maxSpeckSize.
 *
 * @returns the same `mask` array (in-place mutation).
 */
export function removeDarkSpecks(
  mask: Uint8Array,
  data: Uint8ClampedArray,
  width: number,
  height: number,
  opts: DarkSpeckOptions
): Uint8Array {
  if (opts.sensitivity <= 0) return mask;

  const bgLum =
    opts.bgColor.r * 0.299 +
    opts.bgColor.g * 0.587 +
    opts.bgColor.b * 0.114;

  // sensitivity 100 → darkness gap ≥ 60 lum, max speck size 400 px
  // sensitivity  50 → darkness gap ≥ 80 lum, max speck size 150 px
  // sensitivity  20 → darkness gap ≥ 92 lum, max speck size 60 px
  const darknessGap = 100 - opts.sensitivity * 0.4;
  const maxSpeckSize = Math.max(20, 4 * opts.sensitivity);

  const total = width * height;
  const isDark = new Uint8Array(total);
  const protect = opts.protectMask;
  for (let i = 0; i < total; i++) {
    if (mask[i] !== 1) continue;
    if (protect && protect[i] === 1) continue;
    const j = i * 4;
    const lum = data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114;
    if (bgLum - lum >= darknessGap) isDark[i] = 1;
  }

  // Connected-component labeling on dark foreground pixels.
  const visited = new Uint8Array(total);
  const stack: number[] = [];
  const componentIndices: number[] = [];

  for (let start = 0; start < total; start++) {
    if (isDark[start] === 0 || visited[start] === 1) continue;

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
        if (isDark[n] === 1 && visited[n] === 0) {
          visited[n] = 1;
          stack.push(n);
        }
      }
      if (x < width - 1) {
        const n = i + 1;
        if (isDark[n] === 1 && visited[n] === 0) {
          visited[n] = 1;
          stack.push(n);
        }
      }
      if (y > 0) {
        const n = i - width;
        if (isDark[n] === 1 && visited[n] === 0) {
          visited[n] = 1;
          stack.push(n);
        }
      }
      if (y < height - 1) {
        const n = i + width;
        if (isDark[n] === 1 && visited[n] === 0) {
          visited[n] = 1;
          stack.push(n);
        }
      }
    }

    // Only carve small components — large dark regions are subject
    // detail (turtle body, signature, etc.).
    if (componentIndices.length <= maxSpeckSize) {
      for (let k = 0; k < componentIndices.length; k++) {
        mask[componentIndices[k]] = 0;
      }
    }
  }

  return mask;
}
