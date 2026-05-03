/**
 * Halftone provider contract (Phase 2.2).
 *
 * Mirrors the Upscale / Vectorize provider pattern. Today the only
 * implementation is `thingDitherProvider` (a wrapper around
 * @thi.ng/pixel-dither), but swapping in a custom WebGL shader or a
 * server-side ImageMagick worker is a registry change with zero panel
 * edits.
 *
 * Halftoning runs locally (no external API call), so the provider is a
 * pure function that takes the image + options and returns a canvas.
 * Tier-gated free-use vs credit-charge happens via /api/halftone/use,
 * decoupled from the actual pixel work.
 */

import type { HalftoneOptions } from '../types';

export interface HalftoneResult {
  /** RGBA canvas: opaque black where there's a dot, fully transparent
   *  elsewhere. Sized to the input image's natural dimensions. */
  canvas: HTMLCanvasElement;
  processingTimeMs?: number;
}

export interface HalftoneProvider {
  id: string;
  label: string;
  run(
    image: HTMLImageElement,
    options: HalftoneOptions
  ): Promise<HalftoneResult>;
}
