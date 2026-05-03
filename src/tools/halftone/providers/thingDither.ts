/**
 * @thi.ng/pixel-dither halftone provider (Phase 2.2).
 *
 * Pure-JS dithering: no native binaries, no API calls, runs in the
 * browser main thread (a Web Worker version is a future optimization
 * if perceived latency becomes an issue).
 *
 * Pipeline:
 *   1. Convert HTMLImageElement → IntBuffer at GRAY8 (single luminance
 *      channel; halftones are monochrome).
 *   2. Apply pre-pass (gamma + contrast) so the user can rescue
 *      under/over-exposed source images without leaving the panel.
 *   3. Run the chosen dither kernel:
 *        - Ordered (Bayer matrix at 4 / 8 / 16) — production-consistent
 *          regular pattern.
 *        - Floyd-Steinberg / Atkinson — error-diffusion for natural
 *          gradients.
 *   4. Convert grayscale 0/255 result to RGBA: opaque black where black,
 *      fully transparent where white. RIP software adds the white
 *      underbase downstream — Phase 1 doesn't generate one.
 */

import {
  GRAY8,
  intBufferFromImage,
  type IntBuffer,
} from '@thi.ng/pixel';
import {
  ATKINSON,
  FLOYD_STEINBERG,
  ditherWith,
  orderedDither,
} from '@thi.ng/pixel-dither';

import type { HalftoneProvider, HalftoneResult } from './types';
import type { HalftoneOptions, OrderedSize } from '../types';

/**
 * Apply gamma + contrast to a GRAY8 IntBuffer in place.
 *
 * Gamma curve: out = (in/255)^(1/gamma) * 255  (standard image gamma).
 * Contrast: out = (in - 128) * factor + 128, clamped.
 *   factor derives from contrast slider [-100, 100] → [0.5, 2.0].
 */
function applyPrePass(buf: IntBuffer, gamma: number, contrast: number) {
  const data = buf.data as unknown as Uint8Array;
  // contrast slider [-100, 100] → factor [0.5, 2.0]
  const factor = contrast >= 0 ? 1 + contrast / 100 : 1 + contrast / 200;
  const invGamma = 1 / gamma;
  for (let i = 0; i < data.length; i++) {
    let v = data[i] / 255;
    // gamma
    v = Math.pow(v, invGamma);
    // contrast
    v = (v - 0.5) * factor + 0.5;
    data[i] = Math.max(0, Math.min(255, Math.round(v * 255)));
  }
}

/**
 * Build an RGBA canvas from a 1-bit (post-dither) GRAY8 buffer:
 * black pixels → opaque black, white pixels → fully transparent.
 *
 * Threshold (0-255) decides the cut: pixels at or below threshold
 * become opaque black. With a properly-dithered buffer the input is
 * already mostly 0 or 255, so threshold acts as a bias (mid = match
 * dither output, lower = more dots, higher = fewer dots).
 */
function bufferToTransparentCanvas(
  buf: IntBuffer,
  threshold: number
): HTMLCanvasElement {
  const w = buf.width;
  const h = buf.height;
  const src = buf.data as unknown as Uint8Array;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');
  const out = ctx.createImageData(w, h);
  const dst = out.data;
  for (let i = 0; i < src.length; i++) {
    const j = i * 4;
    if (src[i] <= threshold) {
      dst[j] = 0;
      dst[j + 1] = 0;
      dst[j + 2] = 0;
      dst[j + 3] = 255;
    } else {
      // Already 0 from createImageData, but explicit for clarity.
      dst[j + 3] = 0;
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
}

/** Map our public OrderedSize to the @thi.ng BayerSize union. */
function toBayerSize(size: OrderedSize): 4 | 8 | 16 {
  return size;
}

export const thingDitherProvider: HalftoneProvider = {
  id: 'thi.ng/pixel-dither',
  label: '@thi.ng/pixel-dither',
  async run(
    image: HTMLImageElement,
    options: HalftoneOptions
  ): Promise<HalftoneResult> {
    const start = Date.now();

    // GRAY8 single-channel buffer (halftone is monochrome).
    const buf = intBufferFromImage(image).as(GRAY8);

    // Pre-pass.
    if (options.gamma !== 1 || options.contrast !== 0) {
      applyPrePass(buf, options.gamma, options.contrast);
    }

    // Dither in place.
    if (options.algorithm === 'ordered') {
      // 2 levels = pure black/white output; matches the transparent-PNG
      // mapping below (any pixel <= threshold becomes opaque black).
      orderedDither(buf, toBayerSize(options.orderedSize), 2);
    } else if (options.algorithm === 'floyd-steinberg') {
      ditherWith(FLOYD_STEINBERG, buf);
    } else {
      ditherWith(ATKINSON, buf);
    }

    // Threshold slider [0, 100] → byte value [0, 255].
    const thresholdByte = Math.round((options.threshold / 100) * 255);
    const canvas = bufferToTransparentCanvas(buf, thresholdByte);

    return {
      canvas,
      processingTimeMs: Date.now() - start,
    };
  },
};
