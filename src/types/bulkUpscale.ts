import { ProcessingMode } from '@/services/deepImage';

export const PRINT_SIZE_PRESETS = [
  { label: 'Custom', widthInches: 0, heightInches: 0 },
  { label: 'Small Transfer (4" x 4")', widthInches: 4, heightInches: 4 },
  { label: 'Medium Transfer (8" x 10")', widthInches: 8, heightInches: 10 },
  { label: 'Large Transfer (11" x 17")', widthInches: 11, heightInches: 17 },
  { label: 'Gang Sheet 22x24', widthInches: 22, heightInches: 24 },
  { label: 'Gang Sheet 22x60', widthInches: 22, heightInches: 60 },
  { label: 'Gang Sheet 22x120', widthInches: 22, heightInches: 120 },
] as const;

export type PrintSizePreset = (typeof PRINT_SIZE_PRESETS)[number];

export const DPI = 300;
export const MAX_BATCH_SIZE = 100;
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_CUSTOM_INCHES = 130;
export const MIN_CUSTOM_INCHES = 1;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export type BulkImageStatus =
  | 'pending' // In settings table, not yet processed
  | 'queued' // Waiting in queue
  | 'uploading' // Uploading to Supabase Storage
  | 'processing' // Sent to /api/upscale, waiting for result
  | 'complete' // Successfully processed
  | 'failed' // Failed after retry
  | 'retrying' // Auto-retrying after first failure
  | 'cancelled'; // Cancelled by user

export interface BulkImageItem {
  id: string;
  file: File;
  previewUrl: string;
  filename: string;
  fileSizeBytes: number;
  originalWidth: number;
  originalHeight: number;

  // Settings (user-configurable)
  presetIndex: number; // Index into PRINT_SIZE_PRESETS, 0 = Custom
  customWidthInches: number;
  customHeightInches: number;
  targetWidthPx: number; // Computed: inches * DPI
  targetHeightPx: number; // Computed: inches * DPI
  processingMode: ProcessingMode;

  // Processing state
  status: BulkImageStatus;
  progress: number; // 0-100
  error?: string;
  retryCount: number;
  resultUrl?: string; // Public Supabase storage URL after success
  imageId?: string; // Gallery image ID after success
}

// Note: includes 502/503 (Bad Gateway, Service Unavailable) as retryable
// even though spec only lists 429/500/504 — these are typically transient
export function isRetryableStatus(httpStatus: number): boolean {
  return [429, 500, 502, 503, 504].includes(httpStatus);
}

export function computeTargetPixels(
  widthInches: number,
  heightInches: number
): { width: number; height: number } {
  return {
    width: Math.round(widthInches * DPI),
    height: Math.round(heightInches * DPI),
  };
}
