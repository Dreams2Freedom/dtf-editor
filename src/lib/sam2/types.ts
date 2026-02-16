/**
 * SAM2 Background Removal - Shared Types
 */

/** Base64-encoded image embeddings from SAM2 encoder */
export interface SAM2Embeddings {
  /** Base64-encoded Float32Array of encoder output */
  data: string;
  /** Tensor shape, e.g. [1, 256, 64, 64] */
  shape: number[];
  /** Original image dimensions before resize to 1024x1024 */
  imageSize: { width: number; height: number };
}

/** A single point prompt for the SAM2 decoder */
export interface PointPrompt {
  /** Normalized x coordinate (0-1) */
  x: number;
  /** Normalized y coordinate (0-1) */
  y: number;
  /** 1 = foreground (keep), 0 = background (remove) */
  label: 0 | 1;
}

/** Input for the SAM2 decoder inference */
export interface SAM2DecoderInput {
  embeddings: SAM2Embeddings;
  points: PointPrompt[];
}

/** Output mask from the SAM2 decoder */
export interface SAM2MaskOutput {
  /** Binary mask as ImageData (alpha: 255=foreground, 0=background) */
  mask: ImageData;
  /** Model confidence score */
  score: number;
  width: number;
  height: number;
}

/** Tool mode for the editor */
export type ToolMode = 'keep' | 'remove';

/** Status of async operations */
export type AsyncStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Encode API response */
export interface EncodeResponse {
  success: boolean;
  embeddings?: string;
  shape?: number[];
  imageSize?: { width: number; height: number };
  error?: string;
}

/** Apply mask API response */
export interface ApplyMaskResponse {
  success: boolean;
  imageId?: string;
  storagePath?: string;
  error?: string;
}
