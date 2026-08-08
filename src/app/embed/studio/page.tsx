'use client';

/**
 * Embeddable per-image Studio (Partner Tools API).
 *
 * Opened by the partner app (e.g. the Shopify gangsheet builder) in an
 * iframe/popup: `/embed/studio?token=<embed-session-token>`. It verifies the
 * token, loads the single image, and lets the user run the in-house tools on it
 * (each call authorized by the token, metered server-side). On "Done" it hands
 * the edited image URL back to the parent via postMessage.
 *
 * Parent integration:
 *   window.addEventListener('message', (e) => {
 *     if (e.data?.type === 'dtf-studio-result') { /* e.data.resultUrl *\/ }
 *     if (e.data?.type === 'dtf-studio-cancel') { /* closed *\/ }
 *   });
 */

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Scissors,
  ArrowUpCircle,
  Pen,
  Ruler,
  Sparkles,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import EmbedBrush from './EmbedBrush';
import { UpscaleOptions, type UpscaleOpts } from './UpscaleOptions';

type Status = 'loading' | 'ready' | 'invalid';

const CHECKER =
  'repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%) 50% / 20px 20px';

function EmbedStudio() {
  const params = useSearchParams();
  const token = params.get('token') || '';

  const [status, setStatus] = useState<Status>('loading');
  const [workingUrl, setWorkingUrl] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [totalCents, setTotalCents] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [printW, setPrintW] = useState(11);
  const [printH, setPrintH] = useState(11);
  // Upscale options popover (mirrors the real tool: scale + mode + face enhance).
  const [upscaleOpen, setUpscaleOpen] = useState(false);
  const [upscaleOpts, setUpscaleOpts] = useState<UpscaleOpts>({
    scale: 4,
    processingMode: 'auto_enhance',
    faceEnhance: false,
  });
  // #1 fix: the canonical URL of the last SUCCESSFUL tool result. `workingUrl`
  // doubles as the tool input + <img> src (and carries a cache-bust query), so
  // posting it on Done risked echoing the merchant's own input back when the
  // state update hadn't committed. This ref is set ONLY on a confirmed
  // resultUrl, so Done always returns the real edited file (or nothing changed).
  const lastResultUrlRef = useRef<string | null>(null);

  // #4: tell the parent the embed is alive as soon as the image is ready, so the
  // host can distinguish "still loading" from "loaded and editable" without
  // relying on the iframe load event (which fires even for a blocked frame).
  const readyPostedRef = useRef(false);

  // Smart refine brush (client-side, free). After Remove BG we hold the pre-cut
  // original (`brushOriginalUrl`, CORS-clean re-host so its pixels are canvas-
  // readable) and the cutout (`workingUrl`). Opening the brush lets the merchant
  // paint Keep/Remove to fix the cut; the refined PNG is uploaded via a signed
  // URL and becomes the new result. `canRefine` gates the button to "there is a
  // cut to refine".
  const [brushOpen, setBrushOpen] = useState(false);
  const [brushOriginalUrl, setBrushOriginalUrl] = useState<string | null>(null);
  const [canRefine, setCanRefine] = useState(false);
  // The image the LAST Remove BG ran on — the "original" the brush restores from.
  const preCutUrlRef = useRef<string | null>(null);

  // #5: pan + zoom on the edited image so merchants can inspect edges (esp.
  // after background removal) before accepting. Self-contained to the embed —
  // wheel to zoom, drag to pan, double-click to reset.
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    px: number;
    py: number;
    panX: number;
    panY: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  const setViewport = useCallback((z: number, p: { x: number; y: number }) => {
    zoomRef.current = z;
    panRef.current = p;
    setZoom(z);
    setPan(p);
  }, []);
  const resetViewport = useCallback(
    () => setViewport(1, { x: 0, y: 0 }),
    [setViewport]
  );

  // Reset the viewport whenever the working image changes (new tool result).
  useEffect(() => {
    setViewport(1, { x: 0, y: 0 });
  }, [workingUrl, setViewport]);

  // Non-passive wheel listener so we can preventDefault the page scroll.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const next = Math.min(8, Math.max(0.2, zoomRef.current * factor));
      if (next === zoomRef.current) return;
      const ratio = next / zoomRef.current;
      const sx = e.clientX - rect.left - rect.width / 2;
      const sy = e.clientY - rect.top - rect.height / 2;
      const p = panRef.current;
      setViewport(next, {
        x: p.x + (sx - p.x) * (1 - ratio),
        y: p.y + (sy - p.y) * (1 - ratio),
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [status, setViewport]);

  const onCanvasPointerDown = (e: React.PointerEvent) => {
    dragRef.current = {
      px: e.clientX,
      py: e.clientY,
      panX: panRef.current.x,
      panY: panRef.current.y,
    };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onCanvasPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setViewport(zoomRef.current, {
      x: d.panX + (e.clientX - d.px),
      y: d.panY + (e.clientY - d.py),
    });
  };
  const onCanvasPointerUp = () => {
    dragRef.current = null;
    setDragging(false);
  };

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }
    (async () => {
      try {
        const res = await fetch('/api/partner/v1/embed-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok || !data.imageUrl) {
          setStatus('invalid');
          return;
        }
        setWorkingUrl(data.imageUrl);
        setStatus('ready');
      } catch {
        setStatus('invalid');
      }
    })();
  }, [token]);

  // #4: announce readiness to the host exactly once, when the embed is
  // interactive. Lets the parent distinguish "loading" from "loaded" without
  // relying on the iframe load event.
  useEffect(() => {
    if (status === 'ready' && !readyPostedRef.current) {
      readyPostedRef.current = true;
      window.parent?.postMessage({ type: 'dtf-studio-ready' }, '*');
    }
  }, [status]);

  const callTool = useCallback(
    async (
      path: string,
      extra: Record<string, unknown> = {}
    ): Promise<Record<string, unknown> | null> => {
      setError(null);
      setNote(null);
      setBusy(path);
      try {
        const res = await fetch(`/api/partner/v1/${path}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Embed-Token': token,
          },
          body: JSON.stringify({ imageUrl: workingUrl, ...extra }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
        const cost = Number(data?.usage?.costCents) || 0;
        setTotalCents(c => c + cost);
        return data;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Tool failed');
        return null;
      } finally {
        setBusy(null);
      }
    },
    [token, workingUrl]
  );

  const runTransform = useCallback(
    async (path: string, extra: Record<string, unknown> = {}) => {
      // Capture the tool INPUT before it's replaced — for Remove BG this is the
      // pre-cut original the refine brush restores wrongly-removed areas from.
      // Use the FULL url (query intact): it's the exact string callTool just
      // fetched, so it's guaranteed fetchable. Stripping "?..." would drop a
      // presigned URL's signature (S3 / Shopify CDN), which then 403s when the
      // rehost route re-fetches it — surfacing as "Could not fetch imageUrl".
      const inputUrl = workingUrl;
      const data = await callTool(path, extra);
      if (data?.resultUrl && typeof data.resultUrl === 'string') {
        // Record the canonical result (no cache-bust query) so Done posts the
        // real edited file, not the input. Then cache-bust the <img> src.
        lastResultUrlRef.current = data.resultUrl;
        setWorkingUrl(`${data.resultUrl}?v=${Date.now()}`);
        if (path === 'background-removal') {
          // Enable the refine brush against the image we just cut.
          preCutUrlRef.current = inputUrl;
          setBrushOriginalUrl(null); // re-host lazily on open
          setCanRefine(true);
        } else {
          // Any other transform changes the pixels — the old cut no longer
          // matches, so hide Refine until the next Remove BG.
          setCanRefine(false);
        }
      }
    },
    [callTool, workingUrl]
  );

  // Open the refine brush: ensure we have a CORS-clean copy of the pre-cut
  // original (the merchant's input often lacks CORS headers, which would taint
  // the canvas and block PNG export), then show the brush over the cutout.
  const openRefine = useCallback(async () => {
    const preCut = preCutUrlRef.current;
    if (!preCut) return;
    setError(null);
    if (brushOriginalUrl) {
      setBrushOpen(true);
      return;
    }
    setBusy('refine');
    try {
      const res = await fetch('/api/partner/v1/rehost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Embed-Token': token },
        body: JSON.stringify({ imageUrl: preCut }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Could not prepare the brush.');
      }
      setBrushOriginalUrl(data.url as string);
      setBrushOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open the brush.');
    } finally {
      setBusy(null);
    }
  }, [brushOriginalUrl, token]);

  // Commit a refined PNG from the brush: upload it to Storage via a one-shot
  // signed URL (bypasses Vercel's ~4.5MB body limit), then make its public URL
  // the new result. No tool endpoint is charged — the brush is free.
  const commitRefine = useCallback(
    async (blob: Blob) => {
      setBrushOpen(false);
      setError(null);
      setBusy('refine');
      try {
        const res = await fetch('/api/partner/v1/embed-save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Embed-Token': token,
          },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (!res.ok || !data.path || !data.token) {
          throw new Error(data.error || 'Could not save the refined image.');
        }
        const { createClientSupabaseClient } = await import(
          '@/lib/supabase/client'
        );
        const supabase = createClientSupabaseClient();
        const { error: upErr } = await supabase.storage
          .from('images')
          .uploadToSignedUrl(data.path as string, data.token as string, blob, {
            contentType: 'image/png',
          });
        if (upErr) throw new Error(upErr.message);
        const publicUrl = data.publicUrl as string;
        lastResultUrlRef.current = publicUrl;
        // The refined PNG becomes the new cutout (seed for the next refine pass).
        // We keep `brushOriginalUrl` (the re-hosted TRUE original) cached so a
        // second pass still restores from real pixels, not the transparent cut.
        setWorkingUrl(`${publicUrl}?v=${Date.now()}`);
        setNote('Edges refined.');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save the image.');
      } finally {
        setBusy(null);
      }
    },
    [token]
  );

  const runDpi = useCallback(async () => {
    const data = await callTool('dpi-check', {
      targetWidthInches: printW,
      targetHeightInches: printH,
    });
    if (data) {
      const dpi = data.dpi as { min?: number } | undefined;
      const meets = data.meetsStandard as boolean;
      setNote(
        `At ${printW}"×${printH}": ${dpi?.min ?? '?'} DPI — ${
          meets ? '✓ meets 300 DPI' : '✗ below 300 DPI (upscale recommended)'
        }`
      );
    }
  }, [callTool, printW, printH]);

  const done = () => {
    // Prefer the last real tool result; fall back to the (unedited) working
    // image only if no tool ran. Never post the cache-bust query.
    const resultUrl =
      lastResultUrlRef.current || workingUrl.split('?')[0] || workingUrl;
    window.parent?.postMessage(
      { type: 'dtf-studio-result', resultUrl, totalCents },
      '*'
    );
  };
  const cancel = () => {
    window.parent?.postMessage({ type: 'dtf-studio-cancel' }, '*');
  };

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  if (status === 'invalid') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-600">
          This editing session is invalid or has expired. Please reopen it from
          your gangsheet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-2">
        <span className="text-sm font-semibold text-gray-800">Edit image</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cancel}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            <X className="h-4 w-4" /> Cancel
          </button>
          <button
            type="button"
            onClick={done}
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Check className="h-4 w-4" /> Done
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
        onPointerCancel={onCanvasPointerUp}
        onDoubleClick={resetViewport}
        className={`relative flex flex-1 items-center justify-center overflow-hidden p-4 select-none ${
          dragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{ background: CHECKER, touchAction: 'none' }}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center',
            lineHeight: 0,
            willChange: 'transform',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={workingUrl}
            alt="Editing"
            draggable={false}
            className="max-h-full max-w-full object-contain"
            style={{ maxHeight: 'calc(100vh - 160px)' }}
          />
        </div>

        {/* Zoom controls (fixed — not panned) */}
        <div className="absolute right-3 top-3 z-10 flex items-center rounded-full border border-gray-200 bg-white/90 text-xs font-medium shadow backdrop-blur-sm">
          <button
            type="button"
            onClick={() =>
              setViewport(Math.max(0.2, zoomRef.current / 1.25), panRef.current)
            }
            className="px-2.5 py-1 text-gray-700 hover:bg-gray-50"
            title="Zoom out"
          >
            −
          </button>
          <span className="select-none px-2 tabular-nums text-gray-500">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() =>
              setViewport(Math.min(8, zoomRef.current * 1.25), panRef.current)
            }
            className="px-2.5 py-1 text-gray-700 hover:bg-gray-50"
            title="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={resetViewport}
            className="border-l border-gray-200 px-2 py-1 text-gray-700 hover:bg-gray-50"
            title="Fit"
          >
            Fit
          </button>
        </div>

        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/60 backdrop-blur-sm">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Working…</span>
          </div>
        )}
      </div>

      {/* Messages */}
      {(note || error) && (
        <div
          className={`px-4 py-1.5 text-center text-xs ${
            error ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'
          }`}
        >
          {error || note}
        </div>
      )}

      {/* Toolbar */}
      <div className="border-t border-gray-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <ToolButton
            label="Remove BG"
            icon={<Scissors className="h-4 w-4" />}
            busy={busy === 'background-removal'}
            disabled={!!busy}
            onClick={() => runTransform('background-removal')}
          />
          <div className="relative inline-block">
            <ToolButton
              label="Upscale"
              icon={<ArrowUpCircle className="h-4 w-4" />}
              busy={busy === 'upscale'}
              disabled={!!busy}
              onClick={() => setUpscaleOpen(o => !o)}
            />
            <UpscaleOptions
              open={upscaleOpen}
              onClose={() => setUpscaleOpen(false)}
              busy={busy === 'upscale'}
              value={upscaleOpts}
              onChange={setUpscaleOpts}
              onApply={() => {
                setUpscaleOpen(false);
                runTransform('upscale', {
                  scale: upscaleOpts.scale,
                  processingMode: upscaleOpts.processingMode,
                  faceEnhance: upscaleOpts.faceEnhance,
                });
              }}
            />
          </div>
          <ToolButton
            label="Vectorize"
            icon={<Pen className="h-4 w-4" />}
            busy={busy === 'vectorize'}
            disabled={!!busy}
            onClick={() => runTransform('vectorize')}
          />
          {canRefine && (
            <ToolButton
              label="Refine"
              icon={<Sparkles className="h-4 w-4" />}
              busy={busy === 'refine'}
              disabled={!!busy}
              onClick={openRefine}
            />
          )}
          <div className="mx-1 h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <input
              type="number"
              value={printW}
              min={1}
              onChange={e => setPrintW(Number(e.target.value) || 1)}
              className="w-12 rounded border border-gray-300 px-1 py-0.5 text-center"
            />
            <span>×</span>
            <input
              type="number"
              value={printH}
              min={1}
              onChange={e => setPrintH(Number(e.target.value) || 1)}
              className="w-12 rounded border border-gray-300 px-1 py-0.5 text-center"
            />
            <span>in</span>
          </div>
          <ToolButton
            label="DPI Check"
            icon={<Ruler className="h-4 w-4" />}
            busy={busy === 'dpi-check'}
            disabled={!!busy}
            onClick={runDpi}
          />
          <div className="flex-1" />
          <span className="text-xs text-gray-400">
            Session cost: ${(totalCents / 100).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Refine brush overlay — rendered at the ROOT (not inside the canvas
          div), so its pointer/wheel events don't bubble into the Studio's
          pan/zoom handlers (which would steal the pointer and break painting).
          It's fixed inset-0, so DOM position doesn't affect its placement. */}
      {brushOpen && brushOriginalUrl && (
        <EmbedBrush
          originalUrl={brushOriginalUrl}
          cutoutUrl={workingUrl}
          onCommit={commitRefine}
          onCancel={() => setBrushOpen(false)}
        />
      )}
    </div>
  );
}

function ToolButton({
  label,
  icon,
  busy,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}

export default function EmbedStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <EmbedStudio />
    </Suspense>
  );
}
