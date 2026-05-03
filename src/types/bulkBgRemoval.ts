// Re-export shared constants from bulkUpscale
export {
  MAX_BATCH_SIZE,
  MAX_FILE_SIZE_BYTES,
  ACCEPTED_IMAGE_TYPES,
  isRetryableStatus,
} from './bulkUpscale';

export type BulkBgRemovalStatus =
  | 'pending' // In file list, not yet processed
  | 'queued' // Waiting in queue
  | 'uploading' // Compressing / uploading
  | 'processing' // Sent to /api/process, waiting for result
  | 'complete' // Successfully processed
  | 'failed' // Failed after retry
  | 'retrying' // Auto-retrying after first failure
  | 'cancelled'; // Cancelled by user

export interface BulkBgRemovalItem {
  id: string;
  file: File;
  previewUrl: string; // Object URL for original preview
  filename: string;
  fileSizeBytes: number;
  originalWidth: number;
  originalHeight: number;

  // Processing state
  status: BulkBgRemovalStatus;
  progress: number; // 0-100
  error?: string;
  retryCount: number;
  resultUrl?: string; // Public URL after headless processing
  imageId?: string; // Gallery image ID after success
  originalPreviewUrl: string; // Kept for before/after comparison

  // Review phase
  flaggedForEdit: boolean; // User marks for ClippingMagic re-edit
  editedUrl?: string; // URL after re-edit (replaces resultUrl in display)
}
