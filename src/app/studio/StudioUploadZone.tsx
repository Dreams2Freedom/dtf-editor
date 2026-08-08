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

import { createClientSupabaseClient } from '@/lib/supabase/client';

interface StudioUploadZoneProps {
  /** Called after a successful upload with the image's public URL. */
  onUploaded: (info: { publicUrl: string }) => void;
}

const ACCEPT = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// Magic-byte signatures — a client-side parity check for the server's old
// validation, since we now upload straight to Storage. Prevents a mislabeled /
// non-image file from being staged even if the MIME type is spoofed.
const IMAGE_SIGNATURES: { type: string; bytes: number[] }[] = [
  { type: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { type: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { type: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF….WEBP
];

async function looksLikeDeclaredImage(file: File): Promise<boolean> {
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const sig = IMAGE_SIGNATURES.find(s => s.type === file.type);
  if (!sig) return false;
  return sig.bytes.every((b, i) => header[i] === b);
}

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
        if (!(await looksLikeDeclaredImage(file))) {
          throw new Error('That file does not look like a valid image.');
        }

        // Upload straight to Supabase Storage from the browser — no serverless
        // function in the path, so no ~4.5MB request-body limit and no extra
        // round-trip. Then load the image into the canvas from its public URL.
        const supabase = createClientSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Please sign in to upload an image.');
        }

        const ext = (file.name.split('.').pop() || 'png')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        const path = `${user.id}/studio-uploads/${Date.now()}.${ext || 'png'}`;
        const { error: upErr } = await supabase.storage
          .from('images')
          .upload(path, file, { contentType: file.type, upsert: true });
        if (upErr) {
          throw new Error(upErr.message || 'Upload failed');
        }

        const { data: pub } = supabase.storage
          .from('images')
          .getPublicUrl(path);
        if (!pub?.publicUrl) {
          throw new Error('Could not resolve the uploaded image URL.');
        }

        onUploaded({ publicUrl: pub.publicUrl });
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
