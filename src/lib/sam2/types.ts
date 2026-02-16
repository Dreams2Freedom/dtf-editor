/**
 * SAM2 Background Removal - Shared Types
 */

/** A single point prompt for SAM2 segmentation */
export interface PointPrompt {
  /** Normalized x coordinate (0-1) */
  x: number;
  /** Normalized y coordinate (0-1) */
  y: number;
  /** 1 = foreground (keep), 0 = background (remove) */
  label: 0 | 1;
}

/** Output mask from SAM2 segmentation */
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

/** Segment API response */
export interface SegmentResponse {
  success: boolean;
  /** Base64-encoded PNG mask (data:image/png;base64,...) */
  maskBase64?: string;
  /** Original image dimensions */
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
