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

export interface UpscaleInput {
  /**
   * Preferred: public URL of the source image. When the working image is
   * already in Supabase Storage (e.g. the original upload), we hand the
   * server this URL so Deep-Image can fetch it directly — avoiding a large
   * re-encoded-PNG upload through the serverless function (faster, and no
   * ~4.5MB request-body limit).
   */
  imageUrl?: string;
  /**
   * Fallback pixels to upload, used when the working image is NOT URL-backed
   * (e.g. it's the blob output of a previous tool in the chain).
   */
  blob?: Blob;
}

export interface UpscaleProvider {
  /** Stable identifier (e.g., 'deepimage'). */
  id: string;
  /** Human label for the UI (e.g., 'Deep-Image.ai'). */
  label: string;
  run(input: UpscaleInput, options: UpscaleOptions): Promise<UpscaleResult>;
}
