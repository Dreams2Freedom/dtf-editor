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
  Check,
  X,
  Loader2,
} from 'lucide-react';
import EmbedBrush from './EmbedBrush';
import { MODES as UPSCALE_MODES, type UpscaleOpts } from './UpscaleOptions';

type EmbedToolId = 'remove' | 'upscale' | 'vectorize' | 'dpi';
const EMBED_TOOLS: { id: EmbedToolId; label: string; icon: typeof Scissors }[] =
  [
    { id: 'remove', label: 'Remove BG', icon: Scissors },
    { id: 'upscale', label: 'Upscale', icon: ArrowUpCircle },
    { id: 'vectorize', label: 'Vectorize', icon: Pen },
    { id: 'dpi', label: 'DPI Check', icon: Ruler },
  ];

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
  // Active tool (Studio-style pill switcher) + upscale options.
  const [activeTool, setActiveTool] = useState<EmbedToolId>('remove');
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

  // Background-removal workspace (the integrated dual-panel brush — like the
  // real DTF Editor bg-removal tool). Selecting Remove BG runs the SAM cut AND
  // re-hosts the pre-cut original (CORS-clean, so the brush can read its
  // pixels), then drops the user straight into the inline brush — no separate
  // "Refine" step. `brushCutoutUrl` is the cut used to seed the brush (captured
  // once so re-applying edits doesn't remount/reset the workspace).
  const [bgWorkspace, setBgWorkspace] = useState(false);
  const [brushOriginalUrl, setBrushOriginalUrl] = useState<string | null>(null);
  const [brushCutoutUrl, setBrushCutoutUrl] = useState<string | null>(null);

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
      const data = await callTool(path, extra);
      if (data?.resultUrl && typeof data.resultUrl === 'string') {
        // Record the canonical result (no cache-bust query) so Done posts the
        // real edited file, not the input. Then cache-bust the <img> src.
        lastResultUrlRef.current = data.resultUrl;
        setWorkingUrl(`${data.resultUrl}?v=${Date.now()}`);
        // Any non-bg transform changes the pixels — an open bg workspace no
        // longer matches, so close it.
        setBgWorkspace(false);
      }
    },
    [callTool]
  );

  // Start background removal: run the SAM cut AND re-host the pre-cut original
  // (CORS-clean, so the brush can read its pixels) in parallel, then drop the
  // user straight into the integrated dual-panel brush workspace — no separate
  // "Refine" step, mirroring the real DTF Editor bg-removal tool.
  const startBgRemoval = useCallback(async () => {
    // Full URL (query intact) — the exact string callTool fetches, so the
    // rehost re-fetch is guaranteed to work even for presigned inputs.
    const preCut = workingUrl;
    setError(null);
    setNote(null);
    setBusy('background-removal');
    try {
      const [cutData, rehost] = await Promise.all([
        callTool('background-removal'),
        fetch('/api/partner/v1/rehost', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Embed-Token': token,
          },
          body: JSON.stringify({ imageUrl: preCut }),
        }).then(async r => ({ ok: r.ok, body: await r.json().catch(() => ({})) })),
      ]);
      if (!cutData?.resultUrl || typeof cutData.resultUrl !== 'string') {
        return; // callTool already surfaced the error
      }
      if (!rehost.ok || !rehost.body?.url) {
        throw new Error(rehost.body?.error || 'Could not prepare the brush.');
      }
      const cutoutUrl = cutData.resultUrl as string;
      lastResultUrlRef.current = cutoutUrl;
      setBrushCutoutUrl(cutoutUrl);
      setBrushOriginalUrl(rehost.body.url as string);
      setWorkingUrl(`${cutoutUrl}?v=${Date.now()}`);
      setBgWorkspace(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Background removal failed.');
    } finally {
      setBusy(null);
    }
  }, [callTool, token, workingUrl]);

  // Apply the brush's current cutout: upload the refined PNG via a one-shot
  // signed URL (bypasses Vercel's ~4.5MB limit) and make it the new result.
  // Free — no tool endpoint is charged. The workspace stays open.
  const commitRefine = useCallback(
    async (blob: Blob) => {
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
        setWorkingUrl(`${publicUrl}?v=${Date.now()}`);
        setNote('Edges applied.');
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
      {/* Header — Studio-style pill switcher + session actions. */}
      <div className="border-b border-gray-200 bg-white px-3 py-2 sm:px-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <span className="hidden text-sm font-semibold text-gray-800 sm:block">
            Edit image
          </span>

          {/* Tool switcher: pill row (desktop) / native select (mobile). */}
          <div className="hidden items-center gap-1 rounded-lg bg-gray-100 p-1 md:flex">
            {EMBED_TOOLS.map(t => {
              const Icon = t.icon;
              const active = activeTool === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTool(t.id)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
          <div className="min-w-0 flex-1 md:hidden">
            <select
              value={activeTool}
              onChange={e => setActiveTool(e.target.value as EmbedToolId)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Switch tool"
            >
              {EMBED_TOOLS.map(t => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={cancel}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 sm:px-3"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Cancel</span>
            </button>
            <button
              type="button"
              onClick={done}
              className="flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 sm:px-3"
            >
              <Check className="h-4 w-4" />
              <span className="hidden sm:inline">Done</span>
            </button>
          </div>
        </div>
      </div>

      {/* Per-tool control strip (mirrors the real Studio's per-tool panel). */}
      <div className="border-b border-gray-200 bg-white px-3 py-2 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          {activeTool === 'remove' && (
            <>
              <StripButton
                label={bgWorkspace ? 'Re-run cutout' : 'Remove background'}
                icon={<Scissors className="h-4 w-4" />}
                busy={busy === 'background-removal'}
                disabled={!!busy}
                primary
                onClick={startBgRemoval}
              />
              <span className="text-xs text-gray-400">
                {bgWorkspace
                  ? 'Paint Keep / Remove to refine, then Apply.'
                  : 'In-house SAM cutout, then hand-refine the edges.'}
              </span>
            </>
          )}

          {activeTool === 'upscale' && (
            <>
              <div className="flex overflow-hidden rounded-lg border border-gray-200">
                {([2, 4] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setUpscaleOpts(o => ({ ...o, scale: s }))}
                    className={`px-3 py-1.5 text-sm font-medium ${
                      upscaleOpts.scale === s
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {s}×
                  </button>
                ))}
              </div>
              <select
                value={upscaleOpts.processingMode}
                onChange={e =>
                  setUpscaleOpts(o => ({
                    ...o,
                    processingMode: e.target
                      .value as UpscaleOpts['processingMode'],
                  }))
                }
                className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-700"
              >
                {UPSCALE_MODES.map(m => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={upscaleOpts.faceEnhance}
                  onChange={e =>
                    setUpscaleOpts(o => ({
                      ...o,
                      faceEnhance: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-blue-600"
                />
                Faces
              </label>
              <StripButton
                label="Apply upscale"
                icon={<ArrowUpCircle className="h-4 w-4" />}
                busy={busy === 'upscale'}
                disabled={!!busy}
                primary
                onClick={() =>
                  runTransform('upscale', {
                    scale: upscaleOpts.scale,
                    processingMode: upscaleOpts.processingMode,
                    faceEnhance: upscaleOpts.faceEnhance,
                  })
                }
              />
            </>
          )}

          {activeTool === 'vectorize' && (
            <>
              <StripButton
                label="Vectorize"
                icon={<Pen className="h-4 w-4" />}
                busy={busy === 'vectorize'}
                disabled={!!busy}
                primary
                onClick={() => runTransform('vectorize')}
              />
              <span className="text-xs text-gray-400">
                Convert to a clean, scalable vector (SVG).
              </span>
            </>
          )}

          {activeTool === 'dpi' && (
            <>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <input
                  type="number"
                  value={printW}
                  min={1}
                  onChange={e => setPrintW(Number(e.target.value) || 1)}
                  className="w-14 rounded border border-gray-300 px-1 py-1 text-center"
                />
                <span>×</span>
                <input
                  type="number"
                  value={printH}
                  min={1}
                  onChange={e => setPrintH(Number(e.target.value) || 1)}
                  className="w-14 rounded border border-gray-300 px-1 py-1 text-center"
                />
                <span>in</span>
              </div>
              <StripButton
                label="Check DPI"
                icon={<Ruler className="h-4 w-4" />}
                busy={busy === 'dpi-check'}
                disabled={!!busy}
                primary
                onClick={runDpi}
              />
            </>
          )}
        </div>
      </div>

      {/* Canvas — integrated bg-removal workspace for the Remove BG tool,
          otherwise the generic pan/zoom image viewer. */}
      {activeTool === 'remove' &&
      bgWorkspace &&
      brushOriginalUrl &&
      brushCutoutUrl ? (
        <div className="flex min-h-0 flex-1">
          <EmbedBrush
            originalUrl={brushOriginalUrl}
            cutoutUrl={brushCutoutUrl}
            onCommit={commitRefine}
            onCancel={() => setBgWorkspace(false)}
          />
        </div>
      ) : (
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
              <span className="text-sm font-medium text-gray-700">
                Working…
              </span>
            </div>
          )}
        </div>
      )}

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

      {/* Footer — session cost. */}
      <div className="flex items-center justify-end border-t border-gray-200 bg-white px-4 py-2">
        <span className="text-xs text-gray-400">
          Session cost: ${(totalCents / 100).toFixed(2)}
        </span>
      </div>

    </div>
  );
}

function StripButton({
  label,
  icon,
  busy,
  disabled,
  onClick,
  primary = false,
}: {
  label: string;
  icon: React.ReactNode;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
        primary
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
      }`}
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
