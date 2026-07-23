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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { toast } from '@/lib/toast';
import { STUDIO_TOOLS, getStudioTool } from '@/tools/registry';
import type { ApplyMetadata, StudioToolId } from '@/tools/types';

import { StudioUploadZone } from './StudioUploadZone';

const DEFAULT_TOOL: StudioToolId = 'upscale';

function isToolId(v: string | null): v is StudioToolId {
  return (
    v === 'bg-removal' ||
    v === 'upscale' ||
    v === 'color-change' ||
    v === 'vectorize' ||
    v === 'halftone'
  );
}

function loadImageFromUrl(url: string, attempt = 0): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    // On retries, cache-bust so a just-uploaded object that wasn't propagated
    // yet — or a non-CORS cached copy poisoned by a plain <img> elsewhere
    // (e.g. the gallery) — is refetched cleanly with CORS.
    img.src =
      attempt > 0
        ? `${url}${url.includes('?') ? '&' : '?'}cb=${attempt}`
        : url;
  });
}

// Retry the image load with backoff. Freshly-uploaded Supabase objects are
// occasionally not readable for a beat, which otherwise surfaces as "image
// didn't upload" with no recovery.
async function loadImageWithRetry(
  url: string,
  retries = 3
): Promise<HTMLImageElement> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await loadImageFromUrl(url, attempt);
    } catch (e) {
      lastErr = e;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 400 * 2 ** attempt));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Failed to load image');
}

function canvasToImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('Failed to convert canvas'));
        return;
      }
      // NOTE: do NOT revoke this object URL on load. The resulting
      // HTMLImageElement's `.src` (this blob URL) is what the tool panels
      // render via `<img src={image.src}>`, so it must stay alive for as
      // long as the image is displayed. Revoking here blanks the working
      // image after every tool apply.
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
  const [saveError, setSaveError] = useState<string | null>(null);
  // The active tool registers a "commit pending edits" function here (see the
  // StudioToolPanelProps contract). Download calls it first so in-panel edits
  // that weren't explicitly applied (e.g. bg-removal brush strokes) are still
  // included in the exported/saved image instead of silently dropped.
  const pendingCommitRef = useRef<
    (() => Promise<HTMLCanvasElement | null>) | null
  >(null);
  // Stable identity so the tool's register effect doesn't churn each render.
  const registerPendingCommit = useCallback(
    (fn: (() => Promise<HTMLCanvasElement | null>) | null) => {
      pendingCommitRef.current = fn;
    },
    []
  );

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
          if (res.status === 401) {
            // Logged-out deep link — prompt sign-up rather than a raw error.
            setShowSignupModal(true);
            setIsLoading(false);
            return;
          }
          const data = await res.json();
          if (!data.success)
            throw new Error(data.error || 'Failed to load image');
          url = data.publicUrl;
        }
        const img = await loadImageWithRetry(url);
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
    async (toolId: StudioToolId | null) => {
      // Commit any pending in-panel edits (e.g. bg-removal brush strokes that
      // were never explicitly "Applied") BEFORE leaving the tool, so switching
      // to another tool carries the edited result forward instead of dropping
      // back to the pre-edit image. Same guarantee as the Download flow — the
      // user shouldn't have to download and re-upload to chain tools.
      const commitPending = pendingCommitRef.current;
      if (commitPending) {
        try {
          const committed = await commitPending();
          if (committed) {
            // commitPending also fires onApply, but that setWorkingImage is
            // async and may not land before the next panel mounts. Set it here
            // from the returned canvas so the next tool receives the result.
            const img = await canvasToImage(committed);
            setWorkingImage(img);
            setHasChanges(true);
            const dpi = Math.round(img.width / 10);
            setImageDpi(dpi);
            setLowQualityWarning(dpi < 300);
          }
        } catch (err) {
          console.error('[Studio] commit before tool switch failed:', err);
        }
      }
      // Clear the outgoing tool's commit hook so it can't fire for the next one.
      pendingCommitRef.current = null;

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
   * Called by StudioUploadZone after it uploads straight to Supabase Storage.
   * The image is already staged and we have its public URL, so we load it
   * directly via the imageUrl param — no /api/uploads/[id] round-trip. (The
   * earlier "raw url failed to load" case was /api/upload's StorageService
   * url; a fresh getPublicUrl on a direct upload is CORS-loadable, same as the
   * gallery "Use a Tool" flow already relies on.)
   */
  const handleUploaded = useCallback(
    ({ publicUrl }: { publicUrl: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('imageUrl', publicUrl);
      params.delete('imageId');
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
        toast.error(
          "Couldn't apply that change to the canvas. Please try again."
        );
      }
    },
    []
  );

  /**
   * Studio-level Download:
   *   1. Triggers a browser download of the current workingImage as PNG.
   *   2. Posts the same blob to /api/studio/save so the finished result also
   *      lands in the user's gallery. That route is SAVE-ONLY — it does not
   *      re-run any AI operation and does not deduct credits (the tools
   *      already charged when they produced their results). This is the fix
   *      for the old path, which re-posted to /api/process and re-ran the
   *      pipeline (double charge) while the default op 422'd (silent no-save).
   *
   * Single primary action chosen over a Save+Download pair to keep the
   * Photoshop/Canva-style flow simple: one button, no decision required.
   */
  const handleDownload = useCallback(async () => {
    if (!workingImage) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      // Flush any pending in-panel edits first so we never export a stale
      // (pre-Apply) image. commitPending returns the freshly committed canvas;
      // we use it directly because the onApply working-image state update is
      // async and not yet visible in this closure.
      let img = workingImage;
      const commitPending = pendingCommitRef.current;
      if (commitPending) {
        try {
          const committed = await commitPending();
          if (committed) img = await canvasToImage(committed);
        } catch (err) {
          console.error('[Studio] pending commit before download failed:', err);
        }
      }

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

      // Save the finished composite to the gallery (no reprocessing, no charge).
      // Stage the full-resolution PNG straight to Supabase Storage from the
      // browser, then hand the save route the public URL. Posting the blob
      // inline (multipart) previously 413'd at Vercel's ~4.5MB body limit for
      // large chained composites (e.g. bg-removal → upscale), which showed a
      // false "couldn't save to gallery" error even though the save was fine.
      const supabase = createClientSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        // Logged-out (or expired) — prompt sign-up instead of failing quietly.
        setShowSignupModal(true);
        return;
      }

      const storagePath = `${user.id}/studio-output/${Date.now()}.png`;
      const { error: stageErr } = await supabase.storage
        .from('images')
        .upload(storagePath, blob, { contentType: 'image/png', upsert: true });
      if (stageErr) {
        setSaveError('Could not save to your gallery');
        console.error('[Studio] gallery stage failed:', stageErr.message);
        return;
      }

      const { data: pub } = supabase.storage
        .from('images')
        .getPublicUrl(storagePath);
      const publicUrl = pub?.publicUrl;
      if (!publicUrl) {
        setSaveError('Could not save to your gallery');
        console.error('[Studio] could not resolve staged image URL');
        return;
      }

      const res = await fetch('/api/studio/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: publicUrl,
          path: storagePath,
          operation: lastApplyMeta?.operation ?? 'studio_composite',
          provider: lastApplyMeta?.provider,
          fileSize: blob.size,
        }),
        credentials: 'include',
      });
      if (res.status === 401) {
        setShowSignupModal(true);
      } else if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // The user already has their downloaded file; surface a soft notice
        // that the gallery copy didn't save rather than failing silently.
        setSaveError(data.error || 'Could not save to your gallery');
        console.error('[Studio] gallery save failed:', data.error || res.status);
      } else {
        const result = await res.json();
        setSavedImageId(result.savedId || null);
      }
    } catch (err) {
      console.error('[Studio] download failed:', err);
      toast.error(
        "Couldn't prepare the download. Please try again."
      );
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
      {/* Header.
          Mobile: tool dropdown + icon-only Reset/Download (no breadcrumb).
          Desktop (md+): breadcrumb + pill switcher + labeled buttons. */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-4 py-2 sm:py-2.5">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Breadcrumb: desktop only — burns too much horizontal space on mobile */}
          <div className="hidden md:block">
            <Breadcrumb
              items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Studio' },
              ]}
            />
          </div>

          {/* Tool switcher — pill row on desktop, native select on mobile */}
          <div className="hidden md:flex items-center gap-1 bg-gray-100 rounded-lg p-1">
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
                  {tool.badge && (
                    <span className="ml-0.5 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide rounded bg-amber-100 text-amber-700 leading-none">
                      {tool.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="md:hidden flex-1 min-w-0">
            <select
              value={activeToolId ?? ''}
              onChange={e => switchTool(e.target.value as StudioToolId)}
              className="w-full text-sm font-medium border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Switch tool"
            >
              {STUDIO_TOOLS.map(tool => (
                <option key={tool.id} value={tool.id}>
                  {tool.label}
                  {tool.badge ? ` (${tool.badge})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Studio-level actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleResetToOriginal}
              disabled={!hasChanges || !originalImage}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Revert workingImage to the originally-uploaded image"
              aria-label="Reset to original"
            >
              <RotateCcw className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={!workingImage || isSaving}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-60"
              title="Download PNG (also saved to your gallery)"
              aria-label="Download"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 animate-spin" />
              ) : (
                <Download className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              )}
              <span className="hidden sm:inline">Download</span>
            </button>
          </div>
        </div>
      </div>

      {/* DPI warning — shown across every tool. Hidden on the Upscale tool
          itself, where it would just point users at the tool they're on. */}
      {lowQualityWarning && workingImage && activeToolId !== 'upscale' && (
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
            // Once a tool result has been applied, workingImage is a
            // tool-derived blob, not the original upload — so imageId no
            // longer describes it. Pass null then (per the StudioTool
            // contract) so a tool can't attribute work to the wrong source.
            imageId={hasChanges ? null : imageId}
            onApply={handleApply}
            onCancel={() => switchTool(null)}
            registerPendingCommit={registerPendingCommit}
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

      {/* Save-failed toast — the download still succeeded; only the gallery
          copy failed, so this is a soft warning, not a hard error. */}
      {saveError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-white px-4 py-2.5 rounded-full shadow-lg shadow-amber-500/25 flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="w-4 h-4" />
          Downloaded · couldn&apos;t save to gallery
          <button
            onClick={() => setSaveError(null)}
            className="underline ml-1 opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
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
