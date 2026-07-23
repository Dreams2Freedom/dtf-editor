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
  | 'am-halftone' // True AM screening (spot function) — real halftone dots
  | 'ordered' // Bayer matrix — production-consistent, regular pattern
  | 'floyd-steinberg' // Error-diffusion — natural gradient
  | 'atkinson'; // Error-diffusion — Macintosh-classic look, tighter dots

/** Bayer matrix size for ordered dithering. Smaller = finer dots. */
export type OrderedSize = 4 | 8 | 16;

/**
 * AM halftone dot shape — the spot function that decides how each cell's
 * dot grows as tone darkens. Round is the classic offset/screen dot.
 */
export type DotShape =
  | 'round'
  | 'ellipse'
  | 'square'
  | 'diamond'
  | 'line'
  | 'wave' // wavy line screen (stylized)
  | 'cross'; // crosshatch screen (stylized)

/**
 * Ink/color mode for the AM screen.
 *  - mono:   single ink colour (default black) — one screen from luminance.
 *  - source: dots keep the source pixel's colour (pop-art colour halftone).
 *  - cmyk:   true 4-colour process — C/M/Y/K separations, each screened at its
 *            own angle and composited (classic rosette).
 */
export type ColorMode = 'mono' | 'source' | 'cmyk';

export interface HalftoneOptions {
  algorithm: HalftoneAlgorithm;
  /** Only used when algorithm === 'ordered'. */
  orderedSize: OrderedSize;
  /** 0-100. Above midpoint → more black, below → more transparent. */
  threshold: number;

  // ---- Knockout (AM mono/source spot workflow) ----
  /**
   * Knockout / garment colour (hex). Pixels matching this colour are knocked
   * out (left transparent) so the shirt shows through; everything else prints
   * as ink dots. This is what makes the design read correctly when pressed onto
   * a garment of this colour.
   */
  knockoutColor: string;
  /**
   * 0-100. Knockout amount — continuously drags the knockout colour in/out.
   * 100 = the knockout colour is fully removed (transparent); 0 = nothing
   * knocked out (printed solid). In between, the knockout region's dots grow /
   * shrink smoothly, even for a PURE colour (a hard black), which the old
   * flat-bias cut could not do.
   */
  knockout: number;
  /**
   * De-fringe edges (opt-in, OFF by default). Erodes the thin anti-aliased
   * fringe along knockout boundaries — e.g. cleaning stray edge dots around the
   * lining of a skull's teeth — without touching solid fills or legit dots.
   */
  deFringe: boolean;
  /** 0-100. De-fringe strength (fringe cutoff + erosion band width). */
  deFringeAmount: number;
  /** -100 to 100. Pre-pass applied before dithering. */
  contrast: number;
  /** 0.5 to 2.0. Pre-pass gamma. >1 lightens, <1 darkens. */
  gamma: number;

  // ---- AM halftone (algorithm === 'am-halftone') ----
  /** Screen frequency in lines per inch. Physical dot pitch = DPI / LPI. */
  lpi: number;
  /** Screen angle in degrees. 45° is the classic single-color angle. */
  angleDeg: number;
  /** Dot shape / spot function. */
  dotShape: DotShape;
  /**
   * Intended print width in inches. Used to derive the effective DPI from
   * the image's pixel width (DPI = pixelWidth / printWidthIn), so LPI is a
   * physically meaningful setting regardless of the source's pixel size.
   */
  printWidthIn: number;
  /** Ink/color mode. */
  colorMode: ColorMode;
  /** Ink color (hex) when colorMode === 'mono'. */
  inkColor: string;
  /** Grunge/texture amount (0-100): procedural noise mixed into the screen. */
  texture: number;
}

export const DEFAULT_HALFTONE_OPTIONS: HalftoneOptions = {
  algorithm: 'am-halftone',
  orderedSize: 8,
  threshold: 50,
  knockoutColor: '#000000',
  // 100 = the knockout colour is fully removed (matches the "black knocked
  // out" default). Drag DOWN to gradually bring the knockout colour back in.
  knockout: 100,
  deFringe: false,
  deFringeAmount: 50,
  contrast: 0,
  gamma: 1,
  lpi: 45,
  angleDeg: 45,
  dotShape: 'round',
  printWidthIn: 11,
  colorMode: 'mono',
  // Dark-garment DTF default: white ink knocked out against the shirt colour.
  inkColor: '#ffffff',
  texture: 0,
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
