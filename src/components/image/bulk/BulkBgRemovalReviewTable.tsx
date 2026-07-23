'use client';

import React, { useState } from 'react';
import {
  Download,
  FolderOpen,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Flag,
  FlagOff,
  Scissors,
  XCircle,
  Ban,
  X,
  ZoomIn,
} from 'lucide-react';
import JSZip from 'jszip';
import { BulkBgRemovalItem } from '@/types/bulkBgRemoval';

interface BulkBgRemovalReviewTableProps {
  items: BulkBgRemovalItem[];
  totalCreditsUsed: number;
  flaggedCount: number;
  hasRetryableFailures: boolean;
  onRetryFailed: () => void;
  onFlagItem: (id: string) => void;
  onUnflagItem: (id: string) => void;
  onReEditFlagged: () => void;
  isHalted: boolean;
}

const MAX_ZIP_SIZE_MB = 500;

/** Convert a data URL to a Blob without fetch (avoids CSP connect-src restrictions) */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

const CHECKERBOARD_STYLE: React.CSSProperties = {
  backgroundImage:
    'repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%)',
  backgroundSize: '16px 16px',
};

export function BulkBgRemovalReviewTable({
  items,
  totalCreditsUsed,
  flaggedCount,
  hasRetryableFailures,
  onRetryFailed,
  onFlagItem,
  onUnflagItem,
  onReEditFlagged,
  isHalted,
}: BulkBgRemovalReviewTableProps) {
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [zipError, setZipError] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<BulkBgRemovalItem | null>(
    null
  );

  const completedItems = items.filter(i => i.status === 'complete');
  const failedItems = items.filter(i => i.status === 'failed');
  const cancelledItems = items.filter(i => i.status === 'cancelled');
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
        const url = item.editedUrl || item.resultUrl;
        if (!url) continue;

        setZipProgress(Math.round(((i + 1) / completedItems.length) * 80));

        let blob: Blob;
        if (url.startsWith('data:')) {
          blob = dataUrlToBlob(url);
        } else {
          const response = await fetch(url);
          if (!response.ok) continue;
          blob = await response.blob();
        }
        totalSize += blob.size;

        if (totalSize > MAX_ZIP_SIZE_MB * 1024 * 1024) {
          setZipError(
            `Total size exceeds ${MAX_ZIP_SIZE_MB} MB. Please download images individually from your gallery.`
          );
          setIsZipping(false);
          return;
        }

        const baseName = item.filename.replace(/\.[^.]+$/, '');
        let zipName = `${baseName}_bg-removed.png`;

        const count = usedNames.get(zipName) || 0;
        if (count > 0) {
          zipName = `${baseName}_bg-removed_${count}.png`;
        }
        usedNames.set(zipName, count + 1);

        zip.file(zipName, blob);
      }

      setZipProgress(90);
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      setZipProgress(100);

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bg_removed_images_${Date.now()}.zip`;
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
              {completedItems.length} of {totalItems} images completed. Purchase
              more credits to process the remaining images.
            </p>
          </div>
        </div>
      )}

      {/* Before/After table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-600">
              <th className="py-3 px-2 w-16">Original</th>
              <th className="py-3 px-2 w-16">Result</th>
              <th className="py-3 px-2">Filename</th>
              <th className="py-3 px-2">Status</th>
              <th className="py-3 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const displayUrl = item.editedUrl || item.resultUrl;

              return (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-2 px-2">
                    {item.status === 'complete' && displayUrl ? (
                      <button
                        onClick={() => setPreviewItem(item)}
                        className="relative group"
                        title="Click to preview"
                      >
                        <img
                          src={item.originalPreviewUrl || item.previewUrl}
                          alt={`Original ${item.filename}`}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded transition-colors flex items-center justify-center">
                          <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ) : (
                      <img
                        src={item.originalPreviewUrl || item.previewUrl}
                        alt={`Original ${item.filename}`}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                  </td>
                  <td className="py-2 px-2">
                    {item.status === 'complete' && displayUrl ? (
                      <button
                        onClick={() => setPreviewItem(item)}
                        className="relative group"
                        title="Click to preview"
                      >
                        <div
                          className="w-12 h-12 rounded overflow-hidden"
                          style={CHECKERBOARD_STYLE}
                        >
                          <img
                            src={displayUrl}
                            alt={`Result ${item.filename}`}
                            className="w-12 h-12 object-cover"
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded transition-colors flex items-center justify-center">
                          <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ) : item.status === 'failed' ? (
                      <div className="w-12 h-12 rounded bg-red-50 flex items-center justify-center">
                        <XCircle className="w-5 h-5 text-red-400" />
                      </div>
                    ) : item.status === 'cancelled' ? (
                      <div className="w-12 h-12 rounded bg-gray-50 flex items-center justify-center">
                        <Ban className="w-5 h-5 text-gray-400" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded bg-gray-100" />
                    )}
                  </td>
                  <td className="py-2 px-2 text-gray-900">
                    <span className="truncate block max-w-[150px]">
                      {item.filename}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    {item.status === 'complete' ? (
                      <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                        <CheckCircle className="w-4 h-4" />
                        {item.editedUrl ? 'Re-edited' : 'Complete'}
                      </span>
                    ) : item.status === 'failed' ? (
                      <div>
                        <span className="flex items-center gap-1 text-red-600 text-xs font-medium">
                          <XCircle className="w-4 h-4" />
                          Failed
                        </span>
                        {item.error && (
                          <p className="text-xs text-red-500 mt-1">
                            {item.error}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-400 text-xs font-medium">
                        <Ban className="w-4 h-4" />
                        Cancelled
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    {item.status === 'complete' && (
                      <button
                        onClick={() =>
                          item.flaggedForEdit
                            ? onUnflagItem(item.id)
                            : onFlagItem(item.id)
                        }
                        className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors ${
                          item.flaggedForEdit
                            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={
                          item.flaggedForEdit
                            ? 'Unflag — remove from re-edit list'
                            : 'Flag for manual re-edit'
                        }
                      >
                        {item.flaggedForEdit ? (
                          <>
                            <FlagOff className="w-3 h-3" />
                            Flagged
                          </>
                        ) : (
                          <>
                            <Flag className="w-3 h-3" />
                            Flag for Edit
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary stats */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="font-medium text-gray-900">
            {completedItems.length} of {totalItems} images processed
          </span>
        </div>

        <div className="grid grid-cols-4 gap-4 text-sm">
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
            <span className="text-gray-500">Flagged</span>
            <p className="font-medium text-orange-600">{flaggedCount}</p>
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
            {failedItems.length} image(s) failed. You can retry them.
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
      <div className="flex gap-3 flex-wrap">
        {flaggedCount > 0 && (
          <button
            onClick={onReEditFlagged}
            className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            <Scissors className="w-5 h-5" />
            Re-edit Flagged ({flaggedCount})
          </button>
        )}
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

      {/* Re-edit info banner */}
      {flaggedCount > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            Re-editing is included at no extra cost. Each image uses only 1
            credit total, regardless of how many times you re-edit it.
          </p>
        </div>
      )}

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

      {/* Preview Modal */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900 truncate pr-4">
                {previewItem.filename}
              </h3>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Side by side comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              {/* Original */}
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">
                  Original
                </p>
                <div className="bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center min-h-[200px]">
                  <img
                    src={
                      previewItem.originalPreviewUrl || previewItem.previewUrl
                    }
                    alt={`Original ${previewItem.filename}`}
                    className="max-w-full max-h-[60vh] object-contain"
                  />
                </div>
              </div>

              {/* Result */}
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">
                  Result {previewItem.editedUrl ? '(Re-edited)' : ''}
                </p>
                <div
                  className="rounded-lg overflow-hidden flex items-center justify-center min-h-[200px]"
                  style={CHECKERBOARD_STYLE}
                >
                  <img
                    src={previewItem.editedUrl || previewItem.resultUrl}
                    alt={`Result ${previewItem.filename}`}
                    className="max-w-full max-h-[60vh] object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between p-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  const url = previewItem.editedUrl || previewItem.resultUrl;
                  if (url) {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download =
                      previewItem.filename.replace(/\.[^.]+$/, '') +
                      '_bg-removed.png';
                    a.click();
                  }
                }}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <Download className="w-4 h-4" />
                Download This Image
              </button>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
