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
    case 'wave': {
      // Wavy line screen: a horizontal line displaced by a sine wave.
      const disp = 0.28 * Math.sin((u + 0.5) * Math.PI * 4);
      return Math.min(1, Math.abs(v - disp) / 0.5);
    }
    case 'cross':
      // Crosshatch: inks along both cell axes, thickening as coverage rises.
      return Math.min(Math.abs(u), Math.abs(v)) / 0.5;
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
  rgba: Uint8ClampedArray; // raw RGBA (for source-colour and CMYK modes)
  width: number;
  height: number;
}

/** Rasterise a source image once into luminance + alpha + RGBA buffers. */
export function extractLuminance(image: HTMLImageElement): LuminanceSource {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('No 2D context');
  ctx.drawImage(image, 0, 0, width, height);
  const rgba = ctx.getImageData(0, 0, width, height).data;
  const n = width * height;
  const lum = new Uint8Array(n);
  const alpha = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const j = i * 4;
    lum[i] = (0.299 * rgba[j] + 0.587 * rgba[j + 1] + 0.114 * rgba[j + 2]) | 0;
    alpha[i] = rgba[j + 3];
  }
  return { lum, alpha, rgba, width, height };
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Deterministic per-pixel white noise in [0,1] for the grunge texture. */
function hashNoise(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

// Standard process screen angles (degrees) and realistic ink multiply colours.
const CMYK_ANGLES = { c: 15, m: 75, y: 0, k: 45 };
const INK_C = [0.0, 0.66, 0.93];
const INK_M = [0.93, 0.1, 0.55];
const INK_Y = [1.0, 0.95, 0.0];

/**
 * Screen a luminance source into a halftone ImageData. Optional `density`
 * (one float per pixel, roughly [-1, 1]) is added to ink coverage so an
 * interactive brush / anchor-spread can grow (positive) or shrink (negative)
 * dots locally. Fast enough for live editing: gamma/contrast is a 256-entry
 * LUT and the inner loop is trig-free.
 */
/** True if the halftone cell at (x,y) inks for a given channel value + angle. */
function screenInk(
  chv: number,
  base: number,
  x: number,
  y: number,
  cosA: number,
  sinA: number,
  invCell: number,
  shape: DotShape
): boolean {
  const coverage = chv + base;
  if (coverage <= 0) return false;
  const sx = x * cosA + y * sinA;
  const sy = y * cosA - x * sinA;
  let u = sx * invCell;
  u = u - Math.floor(u) - 0.5;
  let v = sy * invCell;
  v = v - Math.floor(v) - 0.5;
  return coverage >= spotThreshold(u, v, shape);
}

export function renderAmImageData(
  src: LuminanceSource,
  options: HalftoneOptions,
  density?: Float32Array | null
): ImageData {
  const { lum, alpha, rgba, width, height } = src;

  const dpi = effectiveDpi(width, options.printWidthIn);
  const lpi = Math.max(5, options.lpi);
  const cell = Math.max(2, dpi / lpi);
  const invCell = 1 / cell;
  const bias = (options.threshold - 50) / 100;
  const shape = options.dotShape;
  const texAmt = ((options.texture || 0) / 100) * 0.6;

  const out = new ImageData(width, height);
  const dst = out.data;

  const deg = (d: number) => (d * Math.PI) / 180;

  if (options.colorMode === 'cmyk') {
    // Each separation is screened at its standard process angle, then the inked
    // channels are composited (multiply) with realistic ink colours.
    const cC = Math.cos(deg(CMYK_ANGLES.c));
    const sC = Math.sin(deg(CMYK_ANGLES.c));
    const cM = Math.cos(deg(CMYK_ANGLES.m));
    const sM = Math.sin(deg(CMYK_ANGLES.m));
    const cY = Math.cos(deg(CMYK_ANGLES.y));
    const sY = Math.sin(deg(CMYK_ANGLES.y));
    const cK = Math.cos(deg(CMYK_ANGLES.k));
    const sK = Math.sin(deg(CMYK_ANGLES.k));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const j = i * 4;
        const al = alpha[i] / 255;
        if (al < 0.004) {
          dst[j + 3] = 0;
          continue;
        }
        const r = rgba[j] / 255;
        const g = rgba[j + 1] / 255;
        const b = rgba[j + 2] / 255;
        const k = 1 - Math.max(r, g, b);
        const denom = 1 - k;
        let cCh = 0;
        let mCh = 0;
        let yCh = 0;
        if (denom > 1e-6) {
          cCh = (1 - r - k) / denom;
          mCh = (1 - g - k) / denom;
          yCh = (1 - b - k) / denom;
        }
        const dens = density ? density[i] : 0;
        const tex = texAmt > 0 ? (hashNoise(x, y) - 0.5) * texAmt : 0;
        const base = -bias + dens + tex;

        let R = 1;
        let G = 1;
        let B = 1;
        let any = false;
        if (screenInk(cCh * al, base, x, y, cC, sC, invCell, shape)) {
          R *= INK_C[0];
          G *= INK_C[1];
          B *= INK_C[2];
          any = true;
        }
        if (screenInk(mCh * al, base, x, y, cM, sM, invCell, shape)) {
          R *= INK_M[0];
          G *= INK_M[1];
          B *= INK_M[2];
          any = true;
        }
        if (screenInk(yCh * al, base, x, y, cY, sY, invCell, shape)) {
          R *= INK_Y[0];
          G *= INK_Y[1];
          B *= INK_Y[2];
          any = true;
        }
        if (screenInk(k * al, base, x, y, cK, sK, invCell, shape)) {
          R = 0;
          G = 0;
          B = 0;
          any = true;
        }
        if (any) {
          dst[j] = (R * 255) | 0;
          dst[j + 1] = (G * 255) | 0;
          dst[j + 2] = (B * 255) | 0;
          dst[j + 3] = 255;
        } else {
          dst[j + 3] = 0;
        }
      }
    }
    return out;
  }

  // Single screen (mono ink colour, or source-colour dots) from luminance.
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

  const cosA = Math.cos(deg(options.angleDeg));
  const sinA = Math.sin(deg(options.angleDeg));
  const ink = options.colorMode === 'mono' ? hexToRgb(options.inkColor) : null;

  for (let y = 0; y < height; y++) {
    const ySin = y * sinA;
    const yCos = y * cosA;
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const j = i * 4;
      const al = alpha[i] / 255;
      let coverage = (1 - toneLUT[lum[i]]) * al - bias;
      if (density) coverage += density[i];
      if (texAmt > 0) coverage += (hashNoise(x, y) - 0.5) * texAmt;

      const sx = x * cosA + ySin;
      const sy = yCos - x * sinA;
      let u = sx * invCell;
      u = u - Math.floor(u) - 0.5;
      let v = sy * invCell;
      v = v - Math.floor(v) - 0.5;

      if (coverage >= spotThreshold(u, v, shape)) {
        if (ink) {
          dst[j] = ink[0];
          dst[j + 1] = ink[1];
          dst[j + 2] = ink[2];
        } else {
          // source-colour: the dot keeps the source pixel's colour.
          dst[j] = rgba[j];
          dst[j + 1] = rgba[j + 1];
          dst[j + 2] = rgba[j + 2];
        }
        dst[j + 3] = 255;
      } else {
        dst[j + 3] = 0; // transparent
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
