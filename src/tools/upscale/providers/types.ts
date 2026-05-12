/**
 * Upscale provider contract (Phase 2.0).
 *
 * Each provider implements this interface and is registered in
 * src/tools/upscale/Panel.tsx. Swapping providers (e.g., from
 * Deep-Image.ai to a different API) is a registry change — no panel
 * code touched.
 */

export type UpscaleProcessingMode =
  | 'auto_enhance'
  | 'generative_upscale'
  | 'basic_upscale';

export interface UpscaleOptions {
  scale: 2 | 4;
  processingMode: UpscaleProcessingMode;
  /** Optional exact-dimensions mode (DPI-aware). */
  targetWidth?: number;
  targetHeight?: number;
}

export interface UpscaleResult {
  /** Direct URL to the upscaled image (typically Supabase storage). */
  url: string;
  /** Optional metadata bubbled up from the provider. */
  processingTimeMs?: number;
}

export interface UpscaleProvider {
  /** Stable identifier (e.g., 'deepimage'). */
  id: string;
  /** Human label for the UI (e.g., 'Deep-Image.ai'). */
  label: string;
  run(blob: Blob, options: UpscaleOptions): Promise<UpscaleResult>;
}
