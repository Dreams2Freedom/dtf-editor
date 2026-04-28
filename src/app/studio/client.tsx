'use client';

/**
 * Studio shell (Phase 2.0).
 *
 * Acts as the durable home for the working image. Tools (BG Remove,
 * Upscale, Color Change) are self-contained plugins that mount inside
 * this shell via the StudioTool / StudioToolPanelProps contract.
 *
 * Flow:
 *   1. Mount loads the original upload (originalImage) from imageId/imageUrl.
 *   2. workingImage starts as a clone of originalImage and is updated
 *      whenever a tool emits onApply(canvas, meta).
 *   3. Tool picker pill row at the top lets the user switch tools at any
 *      time. The active tool's Panel renders in the main area.
 *   4. Download triggers a PNG download AND auto-saves the workingImage
 *      to the user's gallery (operation_type tagged from the most recent
 *      applied meta) — single primary action, Photoshop-style.
 *   5. Reset to Original reverts workingImage back to the upload.
 *
 * Tool plugins live under src/tools/<tool-id>/. Studio knows nothing
 * about a specific tool's logic; it just iterates over STUDIO_TOOLS
 * and mounts the active descriptor's Panel.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowUpRight,
  Download,
  Loader2,
  RotateCcw,
} from 'lucide-react';

import { SignupModal } from '@/components/auth/SignupModal';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { STUDIO_TOOLS, getStudioTool } from '@/tools/registry';
import type { ApplyMetadata, StudioToolId } from '@/tools/types';

import { StudioUploadZone } from './StudioUploadZone';

const DEFAULT_TOOL: StudioToolId = 'bg-removal';

function isToolId(v: string | null): v is StudioToolId {
  return (
    v === 'bg-removal' ||
    v === 'upscale' ||
    v === 'color-change' ||
    v === 'vectorize'
  );
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

function canvasToImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('Failed to convert canvas'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    }, 'image/png');
  });
}

export default function StudioClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const imageId = searchParams.get('imageId');
  const imageUrlParam = searchParams.get('imageUrl');
  const initialToolParam = searchParams.get('tool');

  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(
    null
  );
  const [workingImage, setWorkingImage] = useState<HTMLImageElement | null>(
    null
  );
  // Phase 2.1: default to BG Removal so the right-hand options panel shows
  // immediately on /studio (matches the unified-shell mockup). User can
  // still switch tools before uploading.
  const [activeToolId, setActiveToolId] = useState<StudioToolId | null>(
    isToolId(initialToolParam) ? initialToolParam : DEFAULT_TOOL
  );
  const [lastApplyMeta, setLastApplyMeta] = useState<ApplyMetadata | null>(
    null
  );
  const [hasChanges, setHasChanges] = useState(false);

  // Phase 2.1: only show the spinner when we have an imageId to fetch.
  // The empty-state (no params) renders the upload zone immediately.
  const [isLoading, setIsLoading] = useState(Boolean(imageId || imageUrlParam));
  const [error, setError] = useState<string | null>(null);
  const [lowQualityWarning, setLowQualityWarning] = useState(false);
  const [imageDpi, setImageDpi] = useState<number | null>(null);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [savedImageId, setSavedImageId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load the original upload (if any) once on mount. Phase 2.1: when
  // neither imageId nor imageUrl is provided, render the upload zone
  // instead of redirecting. Studio is the single editing entry point.
  useEffect(() => {
    if (!imageId && !imageUrlParam) {
      setIsLoading(false);
      return;
    }

    const load = async () => {
      try {
        let url: string;
        if (imageUrlParam) {
          url = imageUrlParam;
        } else {
          const res = await fetch(`/api/uploads/${imageId}`, {
            credentials: 'include',
          });
          const data = await res.json();
          if (!data.success)
            throw new Error(data.error || 'Failed to load image');
          url = data.publicUrl;
        }
        const img = await loadImageFromUrl(url);
        setOriginalImage(img);
        setWorkingImage(img);
        setIsLoading(false);
        const dpi = Math.round(img.width / 10);
        setImageDpi(dpi);
        if (dpi < 300) setLowQualityWarning(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load image');
        setIsLoading(false);
      }
    };

    load();
  }, [imageId, imageUrlParam]);

  const switchTool = useCallback(
    (toolId: StudioToolId | null) => {
      setActiveToolId(toolId);
      setSavedImageId(null);
      const params = new URLSearchParams(searchParams.toString());
      if (toolId) params.set('tool', toolId);
      else params.delete('tool');
      router.replace(`/studio?${params.toString()}`);
    },
    [router, searchParams]
  );

  /**
   * Called by StudioUploadZone after a successful /api/upload. Updates
   * the URL with the new imageId so the load effect picks it up and
   * hydrates originalImage / workingImage — same path as a deep link.
   */
  const handleUploaded = useCallback(
    ({ imageId: newId }: { imageId: string; publicUrl: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('imageId', newId);
      params.delete('imageUrl');
      if (activeToolId) params.set('tool', activeToolId);
      router.replace(`/studio?${params.toString()}`);
    },
    [router, searchParams, activeToolId]
  );

  /**
   * The plugin contract's onApply: a tool emits this when the user
   * commits its result. Studio takes the canvas, builds a new
   * HTMLImageElement, and updates workingImage so the next tool sees
   * the chained result.
   */
  const handleApply = useCallback(
    async (canvas: HTMLCanvasElement, meta: ApplyMetadata) => {
      try {
        const img = await canvasToImage(canvas);
        setWorkingImage(img);
        setHasChanges(true);
        setLastApplyMeta(meta);
        setSavedImageId(null);
        // Update DPI calc for the new working image.
        const dpi = Math.round(img.width / 10);
        setImageDpi(dpi);
        setLowQualityWarning(dpi < 300);
      } catch (err) {
        console.error('[Studio] handleApply failed:', err);
      }
    },
    []
  );

  /**
   * Studio-level Download:
   *   1. Triggers a browser download of the current workingImage as PNG.
   *   2. Posts the same blob to /api/process so the result also lands
   *      in the user's gallery as a backup. The save is fire-and-forget
   *      from the user's perspective — Download is the explicit action,
   *      gallery insertion is automatic insurance.
   *
   * Single primary action chosen over a Save+Download pair to keep the
   * Photoshop/Canva-style flow simple: one button, no decision required.
   */
  const handleDownload = useCallback(async () => {
    const img = workingImage;
    if (!img) return;
    setIsSaving(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to create canvas');
      ctx.drawImage(img, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          b => (b ? resolve(b) : reject(new Error('Export failed'))),
          'image/png'
        )
      );

      // Trigger the browser download immediately so the user gets the
      // file even if the gallery save is slow / fails.
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `dtf-${(lastApplyMeta?.operation ?? 'studio').replace(/[^a-z0-9_-]+/gi, '-')}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);

      // Auto-save to gallery so the user can come back later.
      const form = new FormData();
      form.append('image', blob, 'studio-output.png');
      form.append('operation', lastApplyMeta?.operation ?? 'studio_composite');
      if (lastApplyMeta?.provider)
        form.append('provider', lastApplyMeta.provider);
      const res = await fetch('/api/process', {
        method: 'POST',
        body: form,
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Don't surface a hard error — the user already has their
        // downloaded file. Log for diagnostics only.
        console.error(
          '[Studio] gallery save failed:',
          data.error || res.status
        );
      } else {
        const result = await res.json();
        setSavedImageId(result.metadata?.savedId || null);
      }
    } catch (err) {
      console.error('[Studio] download failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [workingImage, lastApplyMeta]);

  const handleResetToOriginal = useCallback(() => {
    if (!originalImage) return;
    setWorkingImage(originalImage);
    setHasChanges(false);
    setLastApplyMeta(null);
    setSavedImageId(null);
    if (imageDpi !== null) {
      setLowQualityWarning(imageDpi < 300);
    }
  }, [originalImage, imageDpi]);

  const activeTool = useMemo(
    () => (activeToolId ? getStudioTool(activeToolId) : undefined),
    [activeToolId]
  );

  return (
    <div className="flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-4">
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Studio' },
            ]}
          />

          {/* Tool switcher — driven by the plugin registry */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {STUDIO_TOOLS.map(tool => {
              const Icon = tool.icon;
              const active = activeToolId === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => switchTool(tool.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    active
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tool.label}
                </button>
              );
            })}
          </div>

          {/* Studio-level actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleResetToOriginal}
              disabled={!hasChanges || !originalImage}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Revert workingImage to the originally-uploaded image"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
            <button
              onClick={handleDownload}
              disabled={!workingImage || isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-60"
              title="Download PNG (also saved to your gallery)"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Download
            </button>
          </div>
        </div>
      </div>

      {/* DPI warning */}
      {lowQualityWarning && workingImage && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5">
          <div className="max-w-[1800px] mx-auto flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 flex-1">
              Low resolution ({imageDpi} DPI at 10&quot; wide). Try the{' '}
              <button
                onClick={() => switchTool('upscale')}
                className="font-medium underline hover:text-amber-900 inline-flex items-center gap-0.5"
              >
                Upscale tool <ArrowUpRight className="w-3 h-3" />
              </button>{' '}
              first for best print quality.
            </p>
            <button
              onClick={() => setLowQualityWarning(false)}
              className="text-xs text-amber-600 hover:text-amber-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0">
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-10 h-10 animate-spin text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Loading image...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-red-50 border border-red-200 text-red-800 p-6 rounded-xl text-center">
              <p className="font-medium mb-2">Failed to load image</p>
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  router.replace('/studio');
                }}
                className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-sm transition-colors"
              >
                Try a different image
              </button>
            </div>
          </div>
        )}

        {/* Phase 2.1: no image yet → render the Upload zone in the canvas
            area. Tool tabs at the top stay interactive so users can pick
            a tool before uploading. */}
        {!isLoading && !workingImage && !error && (
          <StudioUploadZone onUploaded={handleUploaded} />
        )}

        {workingImage && !error && !activeTool && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <p className="text-lg text-gray-700 mb-2 font-medium">
                Pick a tool above to get started
              </p>
              <p className="text-sm text-gray-500">
                Your image lives here — apply tools in any order, chain results
                together, then Download when you&apos;re happy (auto-saves to
                your gallery).
              </p>
            </div>
          </div>
        )}

        {workingImage && !error && activeTool && (
          <activeTool.Panel
            image={workingImage}
            imageId={imageId}
            onApply={handleApply}
            onCancel={() => switchTool(null)}
          />
        )}
      </div>

      {/* Saved toast */}
      {savedImageId && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-2.5 rounded-full shadow-lg shadow-green-500/25 flex items-center gap-2 text-sm font-medium">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
          Downloaded · Saved to gallery
          <a
            href="/dashboard#my-images"
            className="underline ml-1 opacity-80 hover:opacity-100"
          >
            View
          </a>
        </div>
      )}

      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        feature="Studio tools"
      />
    </div>
  );
}
