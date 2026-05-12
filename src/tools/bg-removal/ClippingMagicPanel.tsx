/**
 * ClippingMagic panel — Phase 2.8 default BG removal experience inside
 * Studio. Mirrors the flow proven in /process/background-removal/client.tsx
 * but adapted to the StudioToolPanelProps contract so the result chains
 * cleanly into the next tool.
 *
 * Flow:
 *   1. Convert the working HTMLImageElement to a PNG blob.
 *   2. POST to /api/clippingmagic/upload (credit balance check, no deduction).
 *   3. Load the CM SDK once (module-level promise).
 *   4. Call ClippingMagic.edit({image:{id,secret}}, cb) — the SDK opens its
 *      own modal overlay on top of the Studio shell.
 *   5. On 'result-generated': deduct 1 credit via /api/credits/deduct (ref-
 *      guarded against double charge), download the PNG via
 *      /api/clippingmagic/download/[id] (also saves to gallery server-side),
 *      decode to canvas, and call onApply so Studio commits + chains.
 *   6. On 'editor-exit' (no result): show a Cancelled state — no credits
 *      were deducted; user can retry or switch to the in-house tool.
 *
 * The "Use in-house Background Remover (beta)" button at the bottom flips
 * the parent adapter into in-house mode. That button is the ONLY surface
 * for reaching the in-house panel now that it's hidden from the picker.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertTriangle, FlaskConical, Scissors } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import type { StudioToolPanelProps } from '../types';

const CM_SDK_URL = 'https://clippingmagic.com/api/v1/ClippingMagic.js';
const CM_API_ID = 24469;

// Module-level so the SDK only loads + initializes once per browser tab,
// even as the user toggles between CM and in-house modes.
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

async function imageElementToPngBlob(image: HTMLImageElement): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');
  ctx.drawImage(image, 0, 0);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('Canvas toBlob returned null'))),
      'image/png'
    );
  });
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

interface ClippingMagicPanelProps extends StudioToolPanelProps {
  onSwitchToInHouse: () => void;
}

type PanelState =
  | { kind: 'uploading' }
  | { kind: 'editing' }
  | { kind: 'downloading' }
  | { kind: 'cancelled' }
  | { kind: 'error'; message: string };

export function ClippingMagicPanel({
  image,
  onApply,
  onSwitchToInHouse,
}: ClippingMagicPanelProps) {
  const [state, setState] = useState<PanelState>({ kind: 'uploading' });

  // Refs survive re-renders triggered by the CM SDK callback firing
  // out-of-React. mountedRef guards against state updates after
  // unmount (user toggled to in-house mid-flight).
  const mountedRef = useRef(true);
  const creditsDeductedRef = useRef(false);
  const { refreshCredits } = useAuthStore();

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    const handleResult = async (cmImageId: string) => {
      if (!mountedRef.current) return;
      setState({ kind: 'downloading' });

      // Deduct credit (SEC-026: ref guard is set BEFORE the fetch and
      // never released, even on failure, to prevent double charges on
      // any retry path).
      if (!creditsDeductedRef.current) {
        creditsDeductedRef.current = true;
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
          if (deductRes.ok) {
            await refreshCredits();
          } else {
            console.error(
              'Credit deduction failed — ref remains locked to prevent double charge'
            );
          }
        } catch (e) {
          console.error(
            'Credit deduction network error — ref remains locked',
            e
          );
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
      } catch (err) {
        if (!mountedRef.current) return;
        setState({
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
          setState({
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
          setState(cur =>
            cur.kind === 'downloading' ? cur : { kind: 'cancelled' }
          );
          break;
        default:
          break;
      }
    };

    (async () => {
      try {
        const blob = await imageElementToPngBlob(image);
        if (cancelled) return;
        const fd = new FormData();
        fd.append(
          'image',
          new File([blob], 'studio-image.png', { type: 'image/png' })
        );

        const uploadRes = await fetch('/api/clippingmagic/upload', {
          method: 'POST',
          body: fd,
          credentials: 'include',
        });
        if (cancelled) return;
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}));
          throw new Error(err.error ?? `Upload failed (${uploadRes.status})`);
        }
        const { image: uploaded } = (await uploadRes.json()) as {
          image: { id: number; secret: string };
        };
        if (cancelled || !mountedRef.current) return;

        await loadCmSdk();
        if (cancelled || !mountedRef.current) return;

        setState({ kind: 'editing' });

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
        if (cancelled || !mountedRef.current) return;
        setState({
          kind: 'error',
          message:
            err instanceof Error
              ? err.message
              : 'Failed to start ClippingMagic',
        });
      }
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [image, onApply, refreshCredits]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-8 w-full">
      <div className="max-w-md w-full">
        {state.kind === 'uploading' && (
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-base font-medium text-gray-900">
              Preparing ClippingMagic editor…
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Uploading your image and loading the editor.
            </p>
          </div>
        )}

        {state.kind === 'editing' && (
          <div className="text-center">
            <Scissors className="w-10 h-10 text-blue-600 mx-auto mb-4" />
            <p className="text-base font-medium text-gray-900">
              ClippingMagic editor is open
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Work on your background removal in the editor overlay. Click{' '}
              <strong>Done</strong> when finished — your result will land back
              in Studio automatically.
            </p>
          </div>
        )}

        {state.kind === 'downloading' && (
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-base font-medium text-gray-900">
              Saving your result…
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Downloading the cutout and adding it to your gallery.
            </p>
          </div>
        )}

        {state.kind === 'cancelled' && (
          <div className="text-center">
            <p className="text-base font-medium text-gray-900 mb-2">
              Editor closed without saving
            </p>
            <p className="text-sm text-gray-500 mb-4">No credits were used.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {state.kind === 'error' && (
          <div className="text-center">
            <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto mb-4" />
            <p className="text-base font-medium text-gray-900 mb-2">
              ClippingMagic error
            </p>
            <p className="text-sm text-gray-500 mb-4 whitespace-pre-line">
              {state.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Retry
            </button>
          </div>
        )}

        <div className="mt-12 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500 mb-2">
            Want to try our experimental free in-house tool?
          </p>
          <button
            onClick={onSwitchToInHouse}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Use in-house Background Remover (beta)
          </button>
        </div>
      </div>
    </div>
  );
}
