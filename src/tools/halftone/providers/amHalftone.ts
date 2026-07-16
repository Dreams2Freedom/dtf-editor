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

export const amHalftoneProvider: HalftoneProvider = {
  id: 'am-halftone',
  label: 'AM Halftone (spot-function screening)',
  async run(
    image: HTMLImageElement,
    options: HalftoneOptions
  ): Promise<HalftoneResult> {
    const start = Date.now();
    const w = image.naturalWidth || image.width;
    const h = image.naturalHeight || image.height;

    // Rasterise the source and read pixels.
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = w;
    srcCanvas.height = h;
    const sctx = srcCanvas.getContext('2d');
    if (!sctx) throw new Error('No 2D context');
    sctx.drawImage(image, 0, 0, w, h);
    const src = sctx.getImageData(0, 0, w, h).data;

    // Cell size (px per halftone cell) = DPI / LPI. Guard tiny cells: below
    // ~2px there's no room for a dot to modulate, so clamp.
    const dpi = effectiveDpi(w, options.printWidthIn);
    const lpi = Math.max(5, options.lpi);
    const cell = Math.max(2, dpi / lpi);
    const invCell = 1 / cell;

    // Screen rotation.
    const a = (options.angleDeg * Math.PI) / 180;
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);

    // Tone pre-pass params (match the dither provider's semantics).
    const invGamma = 1 / (options.gamma || 1);
    const cfactor =
      options.contrast >= 0
        ? 1 + options.contrast / 100
        : 1 + options.contrast / 200;
    // Threshold slider [0,100] biases ink coverage: <50 = more/darker dots,
    // >50 = sparser. Centre (50) is neutral.
    const bias = (options.threshold - 50) / 100;

    const out = new ImageData(w, h);
    const dst = out.data;
    const shape = options.dotShape;

    for (let y = 0; y < h; y++) {
      // Rotated-space contribution of y, hoisted out of the x loop.
      const ySin = y * sinA;
      const yCos = y * cosA;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;

        // Transparent source contributes no ink.
        const alpha = src[i + 3] / 255;
        // Luminance (Rec. 601) → tone [0,1].
        let tone =
          (0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2]) / 255;
        tone = Math.pow(tone, invGamma);
        tone = (tone - 0.5) * cfactor + 0.5;
        if (tone < 0) tone = 0;
        else if (tone > 1) tone = 1;

        // Ink coverage: darker = more ink. Alpha-weighted, threshold-biased.
        const coverage = (1 - tone) * alpha - bias;

        // Position within the (rotated) halftone cell, mapped to [-0.5,0.5].
        const sx = x * cosA + ySin;
        const sy = yCos - x * sinA;
        let u = sx * invCell;
        u = u - Math.floor(u) - 0.5;
        let v = sy * invCell;
        v = v - Math.floor(v) - 0.5;

        if (coverage >= spotThreshold(u, v, shape)) {
          dst[i] = 0;
          dst[i + 1] = 0;
          dst[i + 2] = 0;
          dst[i + 3] = 255;
        } else {
          dst[i + 3] = 0; // transparent (createImageData zero-fills RGB)
        }
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context');
    ctx.putImageData(out, 0, 0);

    return { canvas, processingTimeMs: Date.now() - start };
  },
};
