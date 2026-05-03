/**
 * Halftone tool — shared types (Phase 1: B&W transparent PNG output).
 *
 * Halftoning converts a continuous-tone image into a pattern of dots so it
 * can be printed cleanly on fabric via DTF. Output is a transparent PNG —
 * black opaque dots over alpha 0 — so RIP software adds the white
 * underbase downstream.
 *
 * Phase 1 ships B&W only. CMYK channel rotation + per-channel angles
 * (K 45°, C 15°, M 75°, Y 0°) and white-underbase generation come in a
 * later phase if user demand surfaces.
 */

export type HalftoneAlgorithm =
  | 'ordered' // Bayer matrix — production-consistent, regular pattern
  | 'floyd-steinberg' // Error-diffusion — natural gradient
  | 'atkinson'; // Error-diffusion — Macintosh-classic look, tighter dots

/** Bayer matrix size for ordered dithering. Smaller = finer dots. */
export type OrderedSize = 4 | 8 | 16;

export interface HalftoneOptions {
  algorithm: HalftoneAlgorithm;
  /** Only used when algorithm === 'ordered'. */
  orderedSize: OrderedSize;
  /** 0-100. Above midpoint → more black, below → more transparent. */
  threshold: number;
  /** -100 to 100. Pre-pass applied before dithering. */
  contrast: number;
  /** 0.5 to 2.0. Pre-pass gamma. >1 lightens, <1 darkens. */
  gamma: number;
}

export const DEFAULT_HALFTONE_OPTIONS: HalftoneOptions = {
  algorithm: 'ordered',
  orderedSize: 8,
  threshold: 50,
  contrast: 0,
  gamma: 1,
};

/**
 * Free uses per month, by subscription tier. Mirrors COLOR_CHANGE_LIMITS.
 *
 * Per product decision: $29+ tiers (starter, pro) get effectively
 * unlimited halftones. Basic ($9.99) and free pay 1 credit per use.
 * Adjust the numbers as pricing firms up; the tier check is the contract.
 */
export const HALFTONE_LIMITS: Record<string, number> = {
  free: 0,
  cancelled: 0,
  basic: 0,
  starter: 9999,
  pro: 9999,
};
