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
