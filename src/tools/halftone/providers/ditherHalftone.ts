/**
 * CSP-safe dither halftone provider — Ordered (Bayer), Floyd-Steinberg, and
 * Atkinson, implemented in plain JS.
 *
 * Replaces the previous @thi.ng/pixel-dither wrapper, which compiled its
 * kernels at runtime via `new Function`/`eval` — blocked by the app's
 * Content-Security-Policy (`unsafe-eval` not allowed), so those modes threw.
 * These are the classic algorithms written directly, no code generation.
 *
 * Output matches the AM provider: opaque black where there's a dot, fully
 * transparent elsewhere, so the RIP adds the white underbase downstream.
 */

import { extractLuminance } from './amHalftone';
import type { HalftoneProvider, HalftoneResult } from './types';
import type { HalftoneOptions, OrderedSize } from '../types';

/** Recursive Bayer threshold matrix, normalised to (0,1). n must be 2^k. */
function bayerMatrix(n: number): number[][] {
  let m: number[][] = [[0]];
  let size = 1;
  while (size < n) {
    const ns = size * 2;
    const nm: number[][] = Array.from({ length: ns }, () => new Array(ns).fill(0));
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = m[y][x];
        nm[y][x] = 4 * v;
        nm[y][x + size] = 4 * v + 2;
        nm[y + size][x] = 4 * v + 3;
        nm[y + size][x + size] = 4 * v + 1;
      }
    }
    m = nm;
    size = ns;
  }
  const denom = n * n;
  return m.map(row => row.map(v => (v + 0.5) / denom));
}

/** Build the gamma+contrast tone LUT (lum 0-255 → tone 0-255). */
function toneLut(gamma: number, contrast: number): Float32Array {
  const invGamma = 1 / (gamma || 1);
  const cfactor = contrast >= 0 ? 1 + contrast / 100 : 1 + contrast / 200;
  const lut = new Float32Array(256);
  for (let l = 0; l < 256; l++) {
    let v = Math.pow(l / 255, invGamma);
    v = (v - 0.5) * cfactor + 0.5;
    lut[l] = (v < 0 ? 0 : v > 1 ? 1 : v) * 255;
  }
  return lut;
}

export const ditherHalftoneProvider: HalftoneProvider = {
  id: 'dither',
  label: 'Dither (ordered / Floyd-Steinberg / Atkinson)',
  async run(
    image: HTMLImageElement,
    options: HalftoneOptions
  ): Promise<HalftoneResult> {
    const start = Date.now();
    const { lum, alpha, width: w, height: h } = extractLuminance(image);
    const n = w * h;

    // Tone (0-255) after gamma/contrast.
    const lut = toneLut(options.gamma, options.contrast);
    const tone = new Float32Array(n);
    for (let i = 0; i < n; i++) tone[i] = lut[lum[i]];

    // Dither to a 0/255 buffer.
    const out = new Uint8Array(n); // 0 = black, 255 = white
    if (options.algorithm === 'ordered') {
      const size = options.orderedSize as OrderedSize;
      const bayer = bayerMatrix(size);
      for (let y = 0; y < h; y++) {
        const row = bayer[y % size];
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          out[i] = tone[i] < row[x % size] * 255 ? 0 : 255;
        }
      }
    } else if (options.algorithm === 'atkinson') {
      const buf = Float32Array.from(tone);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          const old = buf[i];
          const nw = old < 128 ? 0 : 255;
          out[i] = nw;
          const e = (old - nw) / 8; // only 6/8 of the error is diffused
          if (x + 1 < w) buf[i + 1] += e;
          if (x + 2 < w) buf[i + 2] += e;
          if (y + 1 < h) {
            if (x - 1 >= 0) buf[i - 1 + w] += e;
            buf[i + w] += e;
            if (x + 1 < w) buf[i + 1 + w] += e;
          }
          if (y + 2 < h) buf[i + 2 * w] += e;
        }
      }
    } else {
      // Floyd-Steinberg (default for the two remaining error-diffusion modes).
      const buf = Float32Array.from(tone);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          const old = buf[i];
          const nw = old < 128 ? 0 : 255;
          out[i] = nw;
          const e = old - nw;
          if (x + 1 < w) buf[i + 1] += (e * 7) / 16;
          if (y + 1 < h) {
            if (x - 1 >= 0) buf[i - 1 + w] += (e * 3) / 16;
            buf[i + w] += (e * 5) / 16;
            if (x + 1 < w) buf[i + 1 + w] += (e * 1) / 16;
          }
        }
      }
    }

    // Compose: black dot → opaque black, white → transparent. The threshold
    // slider biases the cut; transparent source pixels stay transparent.
    const thresholdByte = Math.round((options.threshold / 100) * 255);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context');
    const img = ctx.createImageData(w, h);
    const dst = img.data;
    for (let i = 0; i < n; i++) {
      const j = i * 4;
      if (alpha[i] >= 128 && out[i] <= thresholdByte) {
        dst[j] = 0;
        dst[j + 1] = 0;
        dst[j + 2] = 0;
        dst[j + 3] = 255;
      } else {
        dst[j + 3] = 0;
      }
    }
    ctx.putImageData(img, 0, 0);

    return { canvas, processingTimeMs: Date.now() - start };
  },
};
