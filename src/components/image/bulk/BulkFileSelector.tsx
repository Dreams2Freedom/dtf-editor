// src/components/image/bulk/BulkFileSelector.tsx
'use client';

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, AlertCircle } from 'lucide-react';
import {
  BulkImageItem,
  MAX_BATCH_SIZE,
  MAX_FILE_SIZE_BYTES,
  ACCEPTED_IMAGE_TYPES,
  PRINT_SIZE_PRESETS,
} from '@/types/bulkUpscale';
import { cn } from '@/utils/cn';

interface BulkFileSelectorProps {
  onFilesSelected: (items: BulkImageItem[]) => void;
  currentCount: number;
  disabled?: boolean;
}

function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to read image'));
    };
    img.src = URL.createObjectURL(file);
  });
}

export function BulkFileSelector({
  onFilesSelected,
  currentCount,
  disabled,
}: BulkFileSelectorProps) {
  const [errors, setErrors] = React.useState<string[]>([]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setErrors([]);
      const newErrors: string[] = [];
      const remaining = MAX_BATCH_SIZE - currentCount;

      if (acceptedFiles.length > remaining) {
        newErrors.push(
          `Only ${remaining} more images can be added (max ${MAX_BATCH_SIZE}).`
        );
        acceptedFiles = acceptedFiles.slice(0, remaining);
      }

      const validFiles: File[] = [];
      for (const file of acceptedFiles) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          newErrors.push(
            `${file.name}: exceeds 25 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB)`
          );
          continue;
        }
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          newErrors.push(
            `${file.name}: unsupported format. Use PNG, JPG, or WEBP.`
          );
          continue;
        }
        validFiles.push(file);
      }

      if (newErrors.length > 0) setErrors(newErrors);

      const items: BulkImageItem[] = [];
      for (const file of validFiles) {
        try {
          const dims = await getImageDimensions(file);
          items.push({
            id: crypto.randomUUID(),
            file,
            previewUrl: URL.createObjectURL(file),
            filename: file.name,
            fileSizeBytes: file.size,
            originalWidth: dims.width,
            originalHeight: dims.height,
            presetIndex: 0, // Custom (unset)
            customWidthInches: 0,
            customHeightInches: 0,
            targetWidthPx: 0,
            targetHeightPx: 0,
            processingMode: 'auto_enhance',
            status: 'pending',
            progress: 0,
            retryCount: 0,
          });
        } catch {
          newErrors.push(`${file.name}: could not read image dimensions.`);
        }
      }

      if (newErrors.length > 0) setErrors(newErrors);
      if (items.length > 0) onFilesSelected(items);
    },
    [currentCount, onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES.reduce(
      (acc, type) => ({ ...acc, [type]: [] }),
      {}
    ),
    maxSize: MAX_FILE_SIZE_BYTES,
    multiple: true,
    disabled,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {isDragActive ? 'Drop images here' : 'Upload Multiple Images'}
        </h3>
        <p className="text-sm text-gray-500 mb-2">
          Drag & drop images here, or click to select files
        </p>
        <p className="text-xs text-gray-400">
          PNG, JPG, WEBP | Max 25 MB each | Up to {MAX_BATCH_SIZE} images
        </p>
      </div>

      {errors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md space-y-1">
          {errors.map((err, i) => (
            <p key={i} className="text-sm text-red-600 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {err}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
