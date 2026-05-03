'use client';

/**
 * Studio upload zone (Phase 2.1).
 *
 * Drag-and-drop / click-to-upload entry point that shows in place of
 * the canvas when Studio has no image loaded yet. Posts to /api/upload
 * (returns { imageId, publicUrl }) and bubbles the result up to the
 * Studio shell so it can hydrate the canvas without a page navigation.
 *
 * Wraps `react-dropzone` (already a project dependency, used by
 * src/components/image/ImageUpload.tsx for bulk flows). This is a
 * Studio-local single-image variant — kept here, not in
 * src/components/, since it's only used by the Studio shell.
 */

import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { Upload, Loader2, AlertCircle } from 'lucide-react';

interface StudioUploadZoneProps {
  /** Called after a successful upload with the new imageId + publicUrl. */
  onUploaded: (info: { imageId: string; publicUrl: string }) => void;
}

const ACCEPT = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

const MAX_SIZE = 10 * 1024 * 1024; // 10MB — must match /api/upload server limit

export function StudioUploadZone({ onUploaded }: StudioUploadZoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback(
    async (accepted: File[], rejected: FileRejection[]) => {
      setError(null);

      if (rejected.length > 0) {
        const first = rejected[0]?.errors[0];
        setError(first?.message || 'File was rejected');
        return;
      }
      const file = accepted[0];
      if (!file) return;

      setIsUploading(true);
      try {
        const fd = new FormData();
        fd.append('image', file, file.name);
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: fd,
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Upload failed');
        }
        onUploaded({ imageId: data.imageId, publicUrl: data.publicUrl });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Upload failed';
        setError(msg);
      } finally {
        setIsUploading(false);
      }
    },
    [onUploaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: ACCEPT,
    maxSize: MAX_SIZE,
    multiple: false,
    disabled: isUploading,
  });

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div
        {...getRootProps()}
        className={`relative w-full max-w-3xl aspect-[3/2] flex flex-col items-center justify-center border-2 border-dashed rounded-2xl transition-colors cursor-pointer ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-blue-400 bg-blue-500 hover:bg-blue-600'
        } ${isUploading ? 'cursor-wait' : ''}`}
        style={{
          backgroundImage:
            'repeating-conic-gradient(rgba(255,255,255,0.06) 0% 25%, transparent 0% 50%)',
          backgroundSize: '20px 20px',
        }}
      >
        <input {...getInputProps()} />

        {isUploading ? (
          <div className="flex flex-col items-center gap-3 text-white">
            <Loader2 className="w-12 h-12 animate-spin" />
            <p className="text-base font-medium">Uploading…</p>
          </div>
        ) : (
          <>
            <Upload className="w-14 h-14 text-white mb-4" />
            <p className="text-3xl sm:text-4xl font-bold text-white mb-2 text-center px-4">
              {isDragActive ? 'Drop to upload' : 'Upload Here'}
            </p>
            <p className="text-sm text-white/80 text-center px-4">
              Drag and drop an image, or click to browse
            </p>
            <p className="text-xs text-white/60 mt-2">
              JPEG, PNG, WebP — up to 10MB
            </p>
          </>
        )}

        {error && (
          <div className="absolute bottom-4 left-4 right-4 bg-red-50 border border-red-200 text-red-800 text-xs px-3 py-2 rounded flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
