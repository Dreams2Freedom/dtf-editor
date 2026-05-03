/**
 * Vectorize provider contract (Phase 2.1).
 *
 * Mirrors the Upscale provider pattern: each provider implements this
 * interface and is registered in src/tools/vectorize/Panel.tsx. Swapping
 * Vectorizer.ai for a different vector-tracing API is a registry change
 * with zero panel edits.
 */

export type VectorFormat = 'svg' | 'pdf';

export interface VectorizeOptions {
  format: VectorFormat;
  /**
   * Target palette size, 1-256. Vectorizer.ai's `processing.max_colors`.
   * Lower values produce bolder/punchier output (fewer shapes); the
   * default `undefined` lets the API auto-detect (effectively 256).
   *
   * Surfaced via the Vectorize Panel's "Colors" preset row so users
   * can refine the output palette without touching the API directly.
   */
  maxColors?: number;
}

export interface VectorizeResult {
  /** URL or data URI to the vector artifact (SVG / PDF). */
  url: string;
  /** Optional metadata bubbled up from the provider. */
  processingTimeMs?: number;
}

export interface VectorizeProvider {
  id: string;
  label: string;
  run(blob: Blob, options: VectorizeOptions): Promise<VectorizeResult>;
}
