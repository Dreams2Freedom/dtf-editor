// src/components/image/bulk/BulkResultsSummary.tsx
'use client';

import React, { useState } from 'react';
import {
  Download,
  FolderOpen,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import JSZip from 'jszip';
import { BulkImageItem } from '@/types/bulkUpscale';

interface BulkResultsSummaryProps {
  items: BulkImageItem[];
  totalCreditsUsed: number;
  hasRetryableFailures: boolean;
  onRetryFailed: () => void;
  isHalted: boolean;
}

const MAX_ZIP_SIZE_MB = 500;

export function BulkResultsSummary({
  items,
  totalCreditsUsed,
  hasRetryableFailures,
  onRetryFailed,
  isHalted,
}: BulkResultsSummaryProps) {
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [zipError, setZipError] = useState<string | null>(null);

  const completedItems = items.filter(i => i.status === 'complete');
  const failedItems = items.filter(i => i.status === 'failed');
  const totalItems = items.length;

  const handleDownloadZip = async () => {
    if (completedItems.length === 0) return;

    setIsZipping(true);
    setZipProgress(0);
    setZipError(null);

    try {
      const zip = new JSZip();
      const usedNames = new Map<string, number>();
      let totalSize = 0;

      for (let i = 0; i < completedItems.length; i++) {
        const item = completedItems[i];
        if (!item.resultUrl) continue;

        setZipProgress(Math.round(((i + 1) / completedItems.length) * 80));

        const response = await fetch(item.resultUrl);
        if (!response.ok) continue;

        const blob = await response.blob();
        totalSize += blob.size;

        if (totalSize > MAX_ZIP_SIZE_MB * 1024 * 1024) {
          setZipError(
            `Total size exceeds ${MAX_ZIP_SIZE_MB} MB. Please download images individually from your gallery.`
          );
          setIsZipping(false);
          return;
        }

        // Deduplicate filenames
        const baseName = item.filename.replace(/\.[^.]+$/, '');
        const ext = item.filename.match(/\.[^.]+$/)?.[0] || '.png';
        let zipName = `${baseName}_upscaled${ext}`;

        const count = usedNames.get(zipName) || 0;
        if (count > 0) {
          zipName = `${baseName}_upscaled_${count}${ext}`;
        }
        usedNames.set(zipName, count + 1);

        zip.file(zipName, blob);
      }

      setZipProgress(90);
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      setZipProgress(100);

      // Trigger download
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `upscaled_images_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setZipError(err.message || 'Failed to create ZIP');
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Halted banner */}
      {isHalted && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">
              Processing stopped — insufficient credits
            </p>
            <p className="text-sm text-red-600">
              {completedItems.length} of {totalItems} images completed.
              Purchase more credits to process the remaining images.
            </p>
          </div>
        </div>
      )}

      {/* Success/failure summary */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="font-medium text-gray-900">
            {completedItems.length} of {totalItems} images processed
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Completed</span>
            <p className="font-medium text-green-600">
              {completedItems.length}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Failed</span>
            <p className="font-medium text-red-600">{failedItems.length}</p>
          </div>
          <div>
            <span className="text-gray-500">Credits Used</span>
            <p className="font-medium text-gray-900">{totalCreditsUsed}</p>
          </div>
        </div>
      </div>

      {/* Failed images retry */}
      {failedItems.length > 0 && hasRetryableFailures && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-orange-800">
            {failedItems.length} image(s) failed. You can retry them one more
            time.
          </span>
          <button
            onClick={onRetryFailed}
            className="flex items-center gap-1.5 text-sm font-medium text-orange-700 hover:text-orange-800"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Failed
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {completedItems.length > 0 && (
          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            <Download className="w-5 h-5" />
            {isZipping
              ? `Creating ZIP... ${zipProgress}%`
              : `Download All as ZIP (${completedItems.length} images)`}
          </button>
        )}
        <a
          href="/dashboard"
          className="flex items-center justify-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-3 px-6 rounded-lg transition-colors"
        >
          <FolderOpen className="w-5 h-5" />
          View in Gallery
        </a>
      </div>

      {/* ZIP progress bar */}
      {isZipping && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${zipProgress}%` }}
          />
        </div>
      )}

      {/* ZIP error */}
      {zipError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{zipError}</p>
        </div>
      )}
    </div>
  );
}
