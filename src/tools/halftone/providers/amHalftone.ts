/**
 * AM (amplitude-modulated) halftone provider — TRUE halftone screening,
 * not dithering.
 *
 * Classic prepress spot-function screening: the image is covered by a
 * regular grid of halftone cells (rotated by the screen angle, spaced by
 * the screen frequency), and within each cell a single dot GROWS as the
 * local tone darkens. That amplitude modulation — bigger dots in shadows,
 * smaller in highlights — is what makes a real halftone, versus a dither
 * that scatters fixed 1px pixels.
 *
 * Per output pixel:
 *   1. luminance → tone, with a gamma/contrast pre-pass.
 *   2. rotate the pixel into screen space by the screen angle.
 *   3. find its position within its halftone cell (cell size in px =
 *      DPI / LPI, DPI derived from the intended print width).
 *   4. evaluate the dot-shape spot function → a threshold in [0,1].
 *   5. ink the pixel (opaque black) when ink coverage >= threshold, else
 *      leave it transparent.
 *
 * Output matches the dither provider: opaque black dots over alpha 0, so
 * the RIP adds the white underbase downstream.
 */

import type { HalftoneProvider, HalftoneResult } from './types';
import type { DotShape, HalftoneOptions } from '../types';

// Max cell-local distances used to normalise each spot function to [0,1].
const MAX_EUCLID = Math.SQRT1_2; // corner distance for a [-0.5,0.5] cell ≈ 0.707

/**
 * Screen threshold surface for a dot shape at cell-local coords (u, v),
 * each in [-0.5, 0.5]. Returns [0,1]: ~0 where the dot forms first (its
 * centre) and ~1 at the last-to-fill point (cell corner). A pixel inks
 * when the local ink coverage is >= this threshold, so as coverage rises
 * the dot grows outward from its centre.
 */
function spotThreshold(u: number, v: number, shape: DotShape): number {
  switch (shape) {
    case 'square':
      // Chebyshev distance; max within the cell = 0.5.
      return Math.max(Math.abs(u), Math.abs(v)) / 0.5;
    case 'diamond':
      // Manhattan distance; max within the cell = 1.0.
      return Math.abs(u) + Math.abs(v);
    case 'line':
      // 1-D screen (parallel lines); max |v| = 0.5.
      return Math.abs(v) / 0.5;
    case 'ellipse': {
      // Elongated round dot — stretch one axis, squash the other.
      const du = u * 1.35;
      const dv = v * 0.8;
      return Math.min(1, Math.sqrt(du * du + dv * dv) / MAX_EUCLID);
    }
    case 'round':
    default:
      return Math.min(1, Math.sqrt(u * u + v * v) / MAX_EUCLID);
  }
}

/** Effective print DPI implied by the image width and intended print width. */
export function effectiveDpi(pixelWidth: number, printWidthIn: number): number {
  if (printWidthIn > 0) return pixelWidth / printWidthIn;
  return 300;
}

/**
 * Per-pixel luminance + alpha extracted once from a source image. Screening
 * reads from this, so interactive re-screens don't re-rasterise the image.
 */
export interface LuminanceSource {
  lum: Uint8Array; // 0-255 luminance per pixel
  alpha: Uint8Array; // 0-255 source alpha per pixel
  width: number;
  height: number;
}

/** Rasterise a source image once into a luminance + alpha buffer. */
export function extractLuminance(image: HTMLImageElement): LuminanceSource {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('No 2D context');
  ctx.drawImage(image, 0, 0, width, height);
  const d = ctx.getImageData(0, 0, width, height).data;
  const n = width * height;
  const lum = new Uint8Array(n);
  const alpha = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const j = i * 4;
    lum[i] = (0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2]) | 0;
    alpha[i] = d[j + 3];
  }
  return { lum, alpha, width, height };
}

/**
 * Screen a luminance source into a halftone ImageData. Optional `density`
 * (one float per pixel, roughly [-1, 1]) is added to ink coverage so an
 * interactive brush / anchor-spread can grow (positive) or shrink (negative)
 * dots locally. Fast enough for live editing: gamma/contrast is a 256-entry
 * LUT and the inner loop is trig-free.
 */
export function renderAmImageData(
  src: LuminanceSource,
  options: HalftoneOptions,
  density?: Float32Array | null
): ImageData {
  const { lum, alpha, width, height } = src;

  const dpi = effectiveDpi(width, options.printWidthIn);
  const lpi = Math.max(5, options.lpi);
  const cell = Math.max(2, dpi / lpi);
  const invCell = 1 / cell;

  const a = (options.angleDeg * Math.PI) / 180;
  const cosA = Math.cos(a);
  const sinA = Math.sin(a);

  // Tone pre-pass (gamma + contrast) as a 256-entry LUT → no pow() in the loop.
  const invGamma = 1 / (options.gamma || 1);
  const cfactor =
    options.contrast >= 0
      ? 1 + options.contrast / 100
      : 1 + options.contrast / 200;
  const toneLUT = new Float32Array(256);
  for (let l = 0; l < 256; l++) {
    let v = Math.pow(l / 255, invGamma);
    v = (v - 0.5) * cfactor + 0.5;
    toneLUT[l] = v < 0 ? 0 : v > 1 ? 1 : v;
  }

  const bias = (options.threshold - 50) / 100;
  const shape = options.dotShape;

  const out = new ImageData(width, height);
  const dst = out.data;

  for (let y = 0; y < height; y++) {
    const ySin = y * sinA;
    const yCos = y * cosA;
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const al = alpha[i] / 255;
      let coverage = (1 - toneLUT[lum[i]]) * al - bias;
      if (density) coverage += density[i];

      const sx = x * cosA + ySin;
      const sy = yCos - x * sinA;
      let u = sx * invCell;
      u = u - Math.floor(u) - 0.5;
      let v = sy * invCell;
      v = v - Math.floor(v) - 0.5;

      const j = i * 4;
      if (coverage >= spotThreshold(u, v, shape)) {
        dst[j] = 0;
        dst[j + 1] = 0;
        dst[j + 2] = 0;
        dst[j + 3] = 255;
      } else {
        dst[j + 3] = 0; // transparent (createImageData zero-fills RGB)
      }
    }
  }
  return out;
}

export const amHalftoneProvider: HalftoneProvider = {
  id: 'am-halftone',
  label: 'AM Halftone (spot-function screening)',
  async run(
    image: HTMLImageElement,
    options: HalftoneOptions
  ): Promise<HalftoneResult> {
    const start = Date.now();
    const src = extractLuminance(image);
    const imgData = renderAmImageData(src, options);
    const canvas = document.createElement('canvas');
    canvas.width = src.width;
    canvas.height = src.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context');
    ctx.putImageData(imgData, 0, 0);
    return { canvas, processingTimeMs: Date.now() - start };
  },
};
