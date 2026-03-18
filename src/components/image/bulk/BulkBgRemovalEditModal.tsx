'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, Loader2, Scissors } from 'lucide-react';
import { BulkBgRemovalItem } from '@/types/bulkBgRemoval';
import { compressImage } from '@/lib/image-compression';

declare global {
  interface Window {
    ClippingMagic: any;
  }
}

interface BulkBgRemovalEditModalProps {
  flaggedItems: BulkBgRemovalItem[];
  onItemEdited: (id: string, newUrl: string) => void;
  onClose: () => void;
}

export function BulkBgRemovalEditModal({
  flaggedItems,
  onItemEdited,
  onClose,
}: BulkBgRemovalEditModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editorOpenRef = useRef(false);

  const currentItem = flaggedItems[currentIndex];
  const total = flaggedItems.length;

  // Load ClippingMagic script
  useEffect(() => {
    const existingScript = document.querySelector(
      'script[src="https://clippingmagic.com/api/v1/ClippingMagic.js"]'
    );

    if (existingScript && window.ClippingMagic) {
      setScriptReady(true);
      return;
    }

    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.src = 'https://clippingmagic.com/api/v1/ClippingMagic.js';
    script.async = true;

    script.onload = () => {
      if (window.ClippingMagic) {
        const errors = window.ClippingMagic.initialize({ apiId: 24469 });
        if (errors.length === 0) {
          setScriptReady(true);
        } else {
          setError('Browser missing required features for the editor.');
        }
      }
    };

    script.onerror = () => {
      setError('Failed to load ClippingMagic editor. Please try again.');
    };

    document.body.appendChild(script);

    return () => {
      const s = document.querySelector(
        'script[src="https://clippingmagic.com/api/v1/ClippingMagic.js"]'
      );
      if (s?.parentNode) s.parentNode.removeChild(s);
    };
  }, []);

  const advanceOrClose = useCallback(() => {
    if (currentIndex + 1 < total) {
      setCurrentIndex(prev => prev + 1);
      setError(null);
    } else {
      onClose();
    }
  }, [currentIndex, total, onClose]);

  const processCurrentItem = useCallback(async () => {
    if (!currentItem || !scriptReady) return;

    setIsUploading(true);
    setError(null);

    try {
      // Compress original file before upload
      const fileToUpload = await compressImage(currentItem.file, {
        maxSizeMB: 3,
        maxDimension: 5000,
      });

      const formData = new FormData();
      formData.append('image', fileToUpload);

      const response = await fetch('/api/clippingmagic/upload-large', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.image) {
        throw new Error(result.error || 'Upload failed');
      }

      setIsUploading(false);

      // Open ClippingMagic editor
      if (editorOpenRef.current) return;
      editorOpenRef.current = true;

      window.ClippingMagic.edit(
        {
          image: {
            id: result.image.id,
            secret: result.image.secret,
          },
          useStickySettings: true,
          hideBottomToolbar: false,
          locale: 'en-US',
        },
        async (opts: any) => {
          switch (opts.event) {
            case 'error':
              editorOpenRef.current = false;
              setError(`Editor error: ${opts.error?.message || 'Unknown error'}`);
              break;

            case 'result-generated': {
              editorOpenRef.current = false;
              setIsDownloading(true);

              try {
                // Download the re-edited result — no additional credit charge
                const dlResponse = await fetch(
                  `/api/clippingmagic/download/${opts.image.id}`
                );

                if (!dlResponse.ok) {
                  throw new Error('Failed to download re-edited image');
                }

                const blob = await dlResponse.blob();
                const url = URL.createObjectURL(blob);

                onItemEdited(currentItem.id, url);
                setIsDownloading(false);
                advanceOrClose();
              } catch (dlErr: any) {
                setIsDownloading(false);
                setError(dlErr.message || 'Download failed');
              }
              break;
            }

            case 'editor-exit':
              editorOpenRef.current = false;
              // User cancelled this edit — skip to next
              advanceOrClose();
              break;
          }
        }
      );
    } catch (err: any) {
      setIsUploading(false);
      editorOpenRef.current = false;
      setError(err.message || 'Failed to upload image for editing');
    }
  }, [currentItem, scriptReady, onItemEdited, advanceOrClose]);

  // Automatically start processing when script is ready and index changes
  useEffect(() => {
    if (scriptReady && currentItem && !isUploading && !isDownloading && !editorOpenRef.current) {
      processCurrentItem();
    }
  }, [scriptReady, currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">
              Re-edit Image {currentIndex + 1} of {total}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Cancel remaining"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current image preview */}
        {currentItem && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2 truncate">
              {currentItem.filename}
            </p>
            <img
              src={currentItem.originalPreviewUrl || currentItem.previewUrl}
              alt={currentItem.filename}
              className="max-h-48 rounded-lg border mx-auto"
            />
          </div>
        )}

        {/* Status */}
        <div className="text-center">
          {isUploading && (
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Uploading image to editor...</span>
            </div>
          )}
          {isDownloading && (
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Downloading re-edited image...</span>
            </div>
          )}
          {!isUploading && !isDownloading && !error && scriptReady && (
            <p className="text-sm text-gray-500">
              The ClippingMagic editor will open in a popup window.
            </p>
          )}
          {!scriptReady && !error && (
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading editor...</span>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={processCurrentItem}
                className="text-xs font-medium text-red-700 hover:text-red-800 underline"
              >
                Retry
              </button>
              <button
                onClick={advanceOrClose}
                className="text-xs font-medium text-gray-600 hover:text-gray-800 underline"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Info banner */}
        <div className="mt-4 p-2 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs text-green-700">
            Re-editing is included at no extra cost — covered by the original 1 credit.
          </p>
        </div>

        {/* Cancel button */}
        <div className="mt-4 text-center">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel remaining edits
          </button>
        </div>
      </div>
    </div>
  );
}
