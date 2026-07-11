/**
 * ClippingMagic panel — Phase 2.8 (redesigned).
 *
 * UX contract (revised after Phase 2.8 v1 user feedback):
 *   - On mount, DO NOT auto-launch ClippingMagic. The working image is
 *     just shown inside the shared Studio canvas, like every other
 *     tool. A primary "Remove Background" button in the sidebar starts
 *     a CM session only on explicit click.
 *   - Coming back to the bg-removal tool after running other tools
 *     (upscale, vectorize, halftone, etc.) shows the CURRENT working
 *     image — which may already be a cutout from a prior CM session —
 *     not a fresh CM launch.
 *   - If the current image already has transparency (heuristic: any
 *     pixel alpha < 250 in a 64×64 sample), the primary button switches
 *     to "Re-edit in ClippingMagic" and a "Download Cutout" button
 *     appears next to it. Otherwise just the primary "Remove
 *     Background" button is shown.
 *   - The CM SDK takes over the screen in a modal overlay while
 *     editing; when the user clicks Done in CM, the result downloads,
 *     onApply commits it to Studio, and the user lands back in the
 *     same panel — now showing the cutout in the Studio canvas with
 *     the post-cutout button set.
 *
 * Layout matches Upscale / Vectorize / Halftone: shared
 * StudioCanvasFrame on the left/top, narrow controls sidebar on the
 * right/bottom (mobile-first via `flex-col lg:flex-row`).
 *
 * Credit deduction continues to flow through /api/credits/deduct on
 * `result-generated` (SEC-026 ref-guarded against double charges).
 * The download route saves to gallery server-side as before.
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2,
  AlertTriangle,
  FlaskConical,
  Scissors,
  Download,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import {
  StudioCanvasFrame,
  CanvasProcessingOverlay,
} from '@/components/studio/StudioCanvasFrame';
import type { StudioToolPanelProps } from '../types';

const CM_SDK_URL = 'https://clippingmagic.com/api/v1/ClippingMagic.js';
// Client SDK apiId. MUST belong to the same ClippingMagic account as the
// server's CLIPPINGMAGIC_API_KEY, or edit() rejects the uploaded image. Read
// from env so a credential rotation doesn't silently break the editor; falls
// back to the current account id.
const CM_API_ID = parseInt(
  process.env.NEXT_PUBLIC_CLIPPING_MAGIC_API_ID || '24469',
  10
);

// Module-level so the SDK only loads + initializes once per browser tab,
// even as the user toggles between CM and in-house modes, or comes back
// to bg-removal from another tool.
let cmSdkPromise: Promise<void> | null = null;

function loadCmSdk(): Promise<void> {
  if (cmSdkPromise) return cmSdkPromise;
  cmSdkPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('ClippingMagic SDK can only load in the browser'));
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).ClippingMagic) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = CM_SDK_URL;
    script.async = true;
    script.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cm = (window as any).ClippingMagic;
      if (!cm) {
        reject(new Error('ClippingMagic SDK loaded but global missing'));
        return;
      }
      const errors = cm.initialize({ apiId: CM_API_ID });
      if (errors && errors.length > 0) {
        reject(
          new Error(
            'Browser missing required features for ClippingMagic. Try Chrome, Firefox, or Safari.'
          )
        );
        return;
      }
      resolve();
    };
    script.onerror = () => {
      cmSdkPromise = null; // allow retry
      reject(new Error('Failed to load ClippingMagic editor script'));
    };
    document.body.appendChild(script);
  });
  return cmSdkPromise;
}

// Full-resolution path: the browser uploads the image straight to Supabase
// Storage (no Vercel request-body limit) and we hand ClippingMagic the URL.
// The only client-side resize is to avoid shipping more than ClippingMagic's
// 26.2-megapixel maximum, which it would downscale to anyway.
const CM_MAX_PIXELS = 26214400;

function pngBlobAtScale(
  image: HTMLImageElement,
  scale: number
): Promise<Blob> {
  const w = Math.max(1, Math.round(image.naturalWidth * scale));
  const h = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');
  ctx.drawImage(image, 0, 0, w, h);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('Canvas toBlob returned null'))),
      'image/png'
    );
  });
}

/**
 * PNG-encode the working image at full resolution, downscaling only if it
 * exceeds ClippingMagic's 26.2-megapixel maximum. Returns whether a downscale
 * happened so the UI can note it.
 */
async function pngBlobForCm(
  image: HTMLImageElement
): Promise<{ blob: Blob; resized: boolean }> {
  const pixels = image.naturalWidth * image.naturalHeight;
  const scale = pixels > CM_MAX_PIXELS ? Math.sqrt(CM_MAX_PIXELS / pixels) : 1;
  const blob = await pngBlobAtScale(image, scale);
  return { blob, resized: scale < 1 };
}

async function decodePngToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to decode result PNG'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D canvas context');
    ctx.drawImage(img, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Cheap heuristic: does the working image have transparent pixels? Used
 *  to decide whether the panel is in "first removal" or "re-edit" mode.
 *  Samples up to 64×64 down-scaled — bounded cost regardless of source
 *  resolution. Returns false on any error (treat as opaque). */
function detectHasTransparency(image: HTMLImageElement): boolean {
  try {
    const canvas = document.createElement('canvas');
    const W = Math.min(64, image.naturalWidth);
    const H = Math.min(64, image.naturalHeight);
    if (W === 0 || H === 0) return false;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.drawImage(image, 0, 0, W, H);
    const { data } = ctx.getImageData(0, 0, W, H);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 250) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function triggerPngDownload(image: HTMLImageElement, filename: string) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.drawImage(image, 0, 0);
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

interface ClippingMagicPanelProps extends StudioToolPanelProps {
  onSwitchToInHouse: () => void;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'editing' }
  | { kind: 'downloading' }
  | { kind: 'error'; message: string };

export function ClippingMagicPanel({
  image,
  onApply,
  onSwitchToInHouse,
}: ClippingMagicPanelProps) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [zoom, setZoom] = useState(1);
  // True when the working image had to be downscaled to fit CM's upload cap.
  const [resizeNotice, setResizeNotice] = useState(false);
  // True once the editor has been "open" a while with no event — lets the
  // user escape if the CM overlay was blocked (popup/ad blocker) and never
  // actually appeared, without auto-killing a legitimately long edit.
  const [editingStuck, setEditingStuck] = useState(false);

  // Refs survive re-renders triggered by the CM SDK callback firing
  // out-of-React.
  const mountedRef = useRef(true);
  const creditsDeductedRef = useRef(false);
  const { user, refreshCredits } = useAuthStore();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Watchdog: surface an escape hatch if the editor has been "open" for a
  // while with no result/exit/error event. Purely additive UI — it never
  // cancels an active edit on its own.
  useEffect(() => {
    if (status.kind !== 'editing') {
      setEditingStuck(false);
      return;
    }
    const t = setTimeout(() => {
      if (mountedRef.current) setEditingStuck(true);
    }, 15000);
    return () => clearTimeout(t);
  }, [status.kind]);

  const handleCancel = () => {
    // Reset the panel to idle so a stuck upload/editor session is recoverable.
    // No credit is charged until result-generated, so cancelling here is safe.
    creditsDeductedRef.current = false;
    setStatus({ kind: 'idle' });
  };

  // Recompute when the working image changes (e.g., user just ran CM and
  // the cutout was committed back via onApply).
  const hasTransparency = useMemo(() => detectHasTransparency(image), [image]);

  const isBusy =
    status.kind === 'uploading' ||
    status.kind === 'editing' ||
    status.kind === 'downloading';

  const handleRemove = async () => {
    if (isBusy) return;

    // Reset deduction guard for THIS session. The guard prevents double-
    // charging within a single CM session (in case the SDK fires
    // result-generated more than once); a brand-new session starts fresh.
    creditsDeductedRef.current = false;
    setResizeNotice(false);

    setStatus({ kind: 'uploading' });

    const handleResult = async (cmImageId: string) => {
      if (!mountedRef.current) return;
      setStatus({ kind: 'downloading' });

      // Charge FIRST and only deliver the cutout if the charge succeeds.
      // Fail CLOSED: a failed deduction must not hand over a paid result.
      // The guard ref also prevents a double-charge if result-generated fires
      // more than once within one session.
      if (!creditsDeductedRef.current) {
        creditsDeductedRef.current = true; // guard repeat result-generated
        try {
          const deductRes = await fetch('/api/credits/deduct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              credits: 1,
              operation: 'background-removal',
            }),
            credentials: 'include',
          });
          if (!deductRes.ok) {
            const err = await deductRes.json().catch(() => ({}));
            throw new Error(
              err.error ??
                (deductRes.status === 402
                  ? 'Not enough credits to remove the background.'
                  : 'Could not deduct a credit for background removal.')
            );
          }
          await refreshCredits();
        } catch (e) {
          // Unlock so the user can retry, and do NOT deliver the cutout.
          creditsDeductedRef.current = false;
          if (!mountedRef.current) return;
          setStatus({
            kind: 'error',
            message:
              e instanceof Error
                ? e.message
                : 'Credit deduction failed — your cutout was not delivered.',
          });
          return;
        }
      }

      try {
        const dlRes = await fetch(`/api/clippingmagic/download/${cmImageId}`, {
          credentials: 'include',
        });
        if (!dlRes.ok) {
          const err = await dlRes.json().catch(() => ({}));
          throw new Error(
            err.error ?? `Failed to download result (${dlRes.status})`
          );
        }
        const pngBlob = await dlRes.blob();
        const canvas = await decodePngToCanvas(pngBlob);
        if (!mountedRef.current) return;
        onApply(canvas, {
          operation: 'background_removal',
          provider: 'clippingmagic',
          modelId: 'clippingmagic-v1',
          creditsUsed: 1,
        });
        // After onApply, Studio swaps in a new working image — our
        // `image` prop will change and the canvas re-renders the cutout
        // automatically. Return to idle so the post-cutout button set
        // (Re-edit + Download) shows.
        if (mountedRef.current) {
          setStatus({ kind: 'idle' });
        }
      } catch (err) {
        if (!mountedRef.current) return;
        setStatus({
          kind: 'error',
          message:
            err instanceof Error ? err.message : 'Failed to fetch result',
        });
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleCmEvent = (opts: any) => {
      if (!mountedRef.current) return;
      switch (opts?.event) {
        case 'error':
          setStatus({
            kind: 'error',
            message:
              opts?.error?.message ?? 'ClippingMagic editor reported an error',
          });
          break;
        case 'result-generated':
          void handleResult(String(opts.image.id));
          break;
        case 'editor-exit':
          // User closed without finishing. No credit was charged.
          setStatus(cur =>
            cur.kind === 'downloading' ? cur : { kind: 'idle' }
          );
          break;
        default:
          break;
      }
    };

    try {
      if (!user?.id) {
        throw new Error('Please sign in to remove backgrounds.');
      }

      // Full resolution — downscale only if beyond ClippingMagic's 26.2MP max.
      const { blob, resized } = await pngBlobForCm(image);
      if (!mountedRef.current) return;
      if (resized) setResizeNotice(true);

      // Upload the image straight to Supabase Storage from the browser (no
      // Vercel request-body limit), then hand ClippingMagic the public URL.
      const supabase = createClientSupabaseClient();
      const storagePath = `${user.id}/studio-cm/${Date.now()}.png`;
      const { error: uploadErr } = await supabase.storage
        .from('images')
        .upload(storagePath, blob, {
          contentType: 'image/png',
          upsert: true,
        });
      if (!mountedRef.current) return;
      if (uploadErr) {
        throw new Error(`Couldn't stage image for upload: ${uploadErr.message}`);
      }

      const { data: pub } = supabase.storage
        .from('images')
        .getPublicUrl(storagePath);
      const publicUrl = pub?.publicUrl;
      if (!publicUrl) throw new Error('Could not resolve uploaded image URL');

      const uploadRes = await fetch('/api/clippingmagic/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: publicUrl, path: storagePath }),
        credentials: 'include',
      });
      if (!mountedRef.current) return;
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err.error ?? `Upload failed (${uploadRes.status})`);
      }
      const { image: uploaded } = (await uploadRes.json()) as {
        image: { id: number; secret: string };
      };
      if (!mountedRef.current) return;

      await loadCmSdk();
      if (!mountedRef.current) return;

      setStatus({ kind: 'editing' });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).ClippingMagic.edit(
        {
          image: { id: uploaded.id, secret: uploaded.secret },
          useStickySettings: true,
          hideBottomToolbar: false,
          locale: 'en-US',
        },
        handleCmEvent
      );
    } catch (err) {
      if (!mountedRef.current) return;
      setStatus({
        kind: 'error',
        message:
          err instanceof Error ? err.message : 'Failed to start ClippingMagic',
      });
    }
  };

  const handleDownload = () => {
    triggerPngDownload(image, `background-removed-${Date.now()}.png`);
  };

  const primaryLabel = hasTransparency
    ? 'Re-edit in ClippingMagic'
    : 'Remove Background';
  const primaryHint = hasTransparency
    ? 'Re-opens the ClippingMagic editor on this cutout for refinements. 1 credit per edit.'
    : 'Opens the ClippingMagic editor in an overlay. 1 credit per removal.';

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0">
      <StudioCanvasFrame
        zoom={zoom}
        onZoomIn={() => setZoom(z => Math.min(z * 1.25, 8))}
        onZoomOut={() => setZoom(z => Math.max(z / 1.25, 0.1))}
        onFit={() => setZoom(1)}
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center',
            lineHeight: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.src}
            alt="Working image"
            className="max-w-full max-h-full shadow-lg rounded block"
            style={{ maxHeight: 'calc(100vh - 280px)' }}
          />
        </div>
        {status.kind === 'uploading' && (
          <CanvasProcessingOverlay label="Uploading to ClippingMagic…" />
        )}
        {status.kind === 'editing' && (
          <CanvasProcessingOverlay label="ClippingMagic editor open" />
        )}
        {status.kind === 'downloading' && (
          <CanvasProcessingOverlay label="Saving cutout…" />
        )}
      </StudioCanvasFrame>

      <div className="w-full lg:w-72 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col overflow-y-auto">
        <div className="p-4 flex flex-col gap-4 flex-1">
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-900">
            <p className="font-medium mb-1 flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5" />
              Background Removal
            </p>
            <p className="text-blue-800/90">{primaryHint}</p>
          </div>

          {resizeNotice && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
              This image was large, so it was resized to fit the background
              remover. Re-upscale the cutout afterward if you need full print
              resolution.
            </div>
          )}

          <button
            type="button"
            onClick={handleRemove}
            disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status.kind === 'uploading' ||
            status.kind === 'editing' ||
            status.kind === 'downloading' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {status.kind === 'uploading' && 'Uploading…'}
                {status.kind === 'editing' && 'Editor open…'}
                {status.kind === 'downloading' && 'Saving cutout…'}
              </>
            ) : (
              <>
                <Scissors className="w-4 h-4" />
                {primaryLabel}
              </>
            )}
          </button>

          {/* Escape hatch while busy — recover from a stuck upload or an
              editor overlay that never appeared (e.g. blocked by a popup
              blocker). */}
          {isBusy && (
            <div className="-mt-2">
              {editingStuck && status.kind === 'editing' && (
                <p className="mb-1.5 text-[11px] text-gray-500">
                  Editor not showing? It may be blocked by a popup / ad blocker.
                </p>
              )}
              <button
                type="button"
                onClick={handleCancel}
                className="w-full text-xs font-medium text-gray-500 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          )}

          {hasTransparency && !isBusy && (
            <button
              type="button"
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Cutout PNG
            </button>
          )}

          {status.kind === 'error' && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-red-900 mb-1">
                    ClippingMagic error
                  </p>
                  <p className="text-xs text-red-800 whitespace-pre-line">
                    {status.message}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatus({ kind: 'idle' })}
                className="mt-2 w-full text-xs text-red-700 hover:text-red-900 font-medium"
              >
                Dismiss
              </button>
            </div>
          )}

          {!isBusy && (
            <div className="mt-auto pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">
                Want to try our experimental free in-house tool?
              </p>
              <button
                type="button"
                onClick={onSwitchToInHouse}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <FlaskConical className="w-3.5 h-3.5" />
                Use in-house Background Remover (beta)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
