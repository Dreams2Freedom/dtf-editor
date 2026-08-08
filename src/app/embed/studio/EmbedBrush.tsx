'use client';

/**
 * Embed Studio — client-side edge-aware refine brush.
 *
 * This is the "smart brush" from the main DTF Studio, ported into the
 * cross-origin Partner embed as a SELF-CONTAINED component. It deliberately
 * does NOT import the main Studio's bg-removal Panel or its `api.ts` client:
 * that path is coupled to a logged-in DTF session (Supabase auth cookies,
 * server SAM endpoints) which don't exist inside a merchant's iframe. Instead
 * it reuses only the PURE geometry functions from `scribbleBrush.ts`
 * (no session/network coupling) and runs entirely in the browser.
 *
 * Flow:
 *   - `originalUrl`  = CORS-clean re-host of the merchant's input (so its pixels
 *     can be read onto a <canvas> without tainting it → export stays allowed).
 *   - `cutoutUrl`    = the current Remove-BG result (already on our Supabase
 *     host, so it's CORS-clean). Its alpha channel seeds the initial keep-mask.
 *   - Keep / Remove strokes grow an edge-aware region over the ORIGINAL pixels
 *     and add/subtract it from the keep-mask.
 *   - On commit we composite ORIGINAL RGB × feathered(keep-mask) alpha and
 *     export a full-resolution PNG, handed back to the page for upload.
 *
 * The brush itself is FREE — no tool endpoint is called here. Metering happened
 * once on the initial Remove-BG ("charge initial only"); manual refinement is
 * unmetered by design.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  X,
  Loader2,
  Undo2,
  Hand,
  Brush,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  strokeToSeeds,
  growRegionFromStroke,
  fillConnectedRegion,
  computeBackgroundMask,
  detectBorderColor,
  featherAlpha,
} from '@/lib/bg-brush/scribble';

// Mirror the real DTF Editor Studio brush tuning exactly (see
// src/tools/bg-removal/Panel.tsx) so the embed brush behaves identically.
const GROW_SEED_RADIUS_DIVISOR = 4; // seed disc radius = brushSize / this
const GROW_MEDIUM_REACH_PER_SIZE = 18; // BFS reach (px) per brush-size unit (fill tier)
const GROW_EDGE_THRESHOLD = 40; // per-step RGB gradient that counts as an edge
const GROW_FLOOD_COLOR_TOLERANCE = 115; // max RGB distance from the seed mean
const REACH_REFERENCE_DIM = 1400; // reach scales up for larger images
const BG_CONNECT_TOLERANCE = 70; // border-colour band for the background partition
const FEATHER_RADIUS = 1; // soft-edge ramp on the exported alpha
const ALPHA_KEEP_THRESHOLD = 16; // cutout alpha above this seeds the keep-mask
const MAX_UNDO = 25;

type Tool = 'keep' | 'remove';

interface Props {
  originalUrl: string;
  cutoutUrl: string;
  onCommit: (blob: Blob) => void;
  onCancel: () => void;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error('Could not load image for refinement.'));
    img.src = url;
  });
}

export default function EmbedBrush({
  originalUrl,
  cutoutUrl,
  onCommit,
  onCancel,
}: Props) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('remove');
  const [brushSize, setBrushSize] = useState(24);
  const [panMode, setPanMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  // Dual-panel: show the original alongside the editable cutout (like the real
  // DTF Editor bg-removal workspace).
  const [splitView, setSplitView] = useState(true);

  // Natural-resolution image data + working keep-mask.
  const dimsRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const origDataRef = useRef<Uint8ClampedArray | null>(null);
  const keepMaskRef = useRef<Uint8Array | null>(null);
  const undoRef = useRef<Uint8Array[]>([]);
  // Background partition (border-connected background over the ORIGINAL pixels),
  // computed lazily once per image and reused by every stroke — the same
  // "fill" mechanism the real Studio brush uses to snap to the whole shape.
  const bgMaskRef = useRef<Uint8Array | null>(null);

  // Visible canvas (intrinsic size = image size; CSS size = fit × zoom).
  const viewRef = useRef<HTMLCanvasElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Live stroke, in image-pixel coordinates.
  const strokeRef = useRef<Array<{ x: number; y: number }> | null>(null);
  const brushSizeRef = useRef(brushSize);
  const toolRef = useRef(tool);
  const panDragRef = useRef<{
    px: number;
    py: number;
    left: number;
    top: number;
  } | null>(null);
  useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSize]);
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  // Paint the composited preview (original RGB × keep-mask alpha) plus the
  // subject silhouette, onto the visible canvas.
  const repaint = useCallback(() => {
    const canvas = viewRef.current;
    const orig = origDataRef.current;
    const keep = keepMaskRef.current;
    if (!canvas || !orig || !keep) return;
    const { w, h } = dimsRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const out = ctx.createImageData(w, h);
    const soft = featherAlpha(keep, w, h, FEATHER_RADIUS);
    for (let i = 0; i < w * h; i++) {
      const j = i * 4;
      out.data[j] = orig[j];
      out.data[j + 1] = orig[j + 1];
      out.data[j + 2] = orig[j + 2];
      out.data[j + 3] = soft[i];
    }
    ctx.clearRect(0, 0, w, h);
    ctx.putImageData(out, 0, 0);
  }, []);

  // Load both images, build original pixel buffer + initial keep-mask.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [origImg, cutImg] = await Promise.all([
          loadImage(originalUrl),
          loadImage(cutoutUrl),
        ]);
        if (cancelled) return;
        const w = origImg.naturalWidth;
        const h = origImg.naturalHeight;
        dimsRef.current = { w, h };

        const oc = document.createElement('canvas');
        oc.width = w;
        oc.height = h;
        const octx = oc.getContext('2d', { willReadFrequently: true });
        if (!octx) throw new Error('Canvas unavailable');
        octx.drawImage(origImg, 0, 0, w, h);
        origDataRef.current = octx.getImageData(0, 0, w, h).data;
        // New original → invalidate the cached background partition.
        bgMaskRef.current = null;

        // Seed the keep-mask from the cutout's alpha (drawn at the SAME size, so
        // a resolution mismatch between the two sources can't shift the mask).
        const cc = document.createElement('canvas');
        cc.width = w;
        cc.height = h;
        const cctx = cc.getContext('2d', { willReadFrequently: true });
        if (!cctx) throw new Error('Canvas unavailable');
        cctx.drawImage(cutImg, 0, 0, w, h);
        const cutData = cctx.getImageData(0, 0, w, h).data;
        const keep = new Uint8Array(w * h);
        for (let i = 0; i < w * h; i++) {
          keep[i] = cutData[i * 4 + 3] > ALPHA_KEEP_THRESHOLD ? 1 : 0;
        }
        keepMaskRef.current = keep;

        const canvas = viewRef.current;
        if (canvas) {
          canvas.width = w;
          canvas.height = h;
        }
        setReady(true);
        // Paint on the next frame once the canvas has its intrinsic size.
        requestAnimationFrame(() => repaint());
      } catch (e) {
        if (!cancelled)
          setLoadError(
            e instanceof Error ? e.message : 'Could not start the brush.'
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [originalUrl, cutoutUrl, repaint]);

  // Map a pointer event to image-pixel coordinates.
  const toImageCoords = useCallback((e: React.PointerEvent) => {
    const canvas = viewRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const { w, h } = dimsRef.current;
    const x = ((e.clientX - rect.left) / rect.width) * w;
    const y = ((e.clientY - rect.top) / rect.height) * h;
    return { x, y };
  }, []);

  const commitStroke = useCallback(
    (path: Array<{ x: number; y: number }>) => {
      const orig = origDataRef.current;
      const keep = keepMaskRef.current;
      if (!orig || !keep || path.length === 0) return;
      const { w, h } = dimsRef.current;
      const total = w * h;
      const sizeAtCommit = brushSizeRef.current;
      const toolAtCommit = toolRef.current;

      // Seeds from the stroke footprint (a solid disc per point).
      const seedRadius = Math.max(1, sizeAtCommit / GROW_SEED_RADIUS_DIVISOR);
      const seeds = strokeToSeeds(path, seedRadius, w, h);

      // Continuous, size-scaled reach — bigger brush travels farther, but always
      // BOUNDED (never the whole image), scaled up for high-res inputs.
      const resFactor = Math.max(1, Math.max(w, h) / REACH_REFERENCE_DIM);
      const reachRadius = Math.max(
        1,
        sizeAtCommit * GROW_MEDIUM_REACH_PER_SIZE * resFactor
      );

      // Background partition over the ORIGINAL pixels (border colour →
      // border-connected background), computed once and cached. This is what
      // makes the real brush "snap" to the whole subject/background instead of
      // a local blob: Keep fills the foreground shape (bgMask 0), Remove fills
      // the background area (bgMask 1), bounded by the reach.
      if (!bgMaskRef.current) {
        const bgColor = detectBorderColor(orig, w, h);
        bgMaskRef.current = computeBackgroundMask(
          orig,
          w,
          h,
          bgColor,
          BG_CONNECT_TOLERANCE
        );
      }
      const bgMask = bgMaskRef.current;
      const passValue: 0 | 1 = toolAtCommit === 'keep' ? 0 : 1;
      let region = fillConnectedRegion(bgMask, passValue, w, h, seeds, reachRadius);

      // Fallback: if the partition fill found nothing (e.g. a Keep stroke on
      // bare background, or a subject part sharing the bg colour), use the
      // edge-aware grow bounded by the SAME reach so the stroke stays local.
      let any = false;
      for (let i = 0; i < region.length; i++) {
        if (region[i]) {
          any = true;
          break;
        }
      }
      if (!any) {
        region = growRegionFromStroke(orig, w, h, seeds, {
          reachRadius,
          edgeThreshold: GROW_EDGE_THRESHOLD,
          colorTolerance: GROW_FLOOD_COLOR_TOLERANCE,
        });
      }
      if (region.length !== total) return;

      // Always claim the literal brush footprint, so a stroke ALWAYS does at
      // least what you painted — even when the smart fill finds nothing.
      const footprintRadius = Math.max(1, sizeAtCommit / 2);
      const footprint = strokeToSeeds(path, footprintRadius, w, h);
      for (const idx of footprint) region[idx] = 1;

      // Snapshot for undo (bounded), then apply: Keep = add, Remove = subtract.
      const before = Uint8Array.from(keep);
      undoRef.current.push(before);
      if (undoRef.current.length > MAX_UNDO) undoRef.current.shift();
      setCanUndo(true);

      if (toolAtCommit === 'keep') {
        for (let i = 0; i < total; i++) keep[i] = keep[i] | region[i];
      } else {
        for (let i = 0; i < total; i++) keep[i] = keep[i] & (region[i] ^ 1);
      }
      repaint();
    },
    [repaint]
  );

  // ---- Pointer handling: pan (scroll) vs. draw ----
  const onPointerDown = (e: React.PointerEvent) => {
    if (!ready || busy) return;
    if (panMode) {
      const sc = scrollRef.current;
      if (!sc) return;
      panDragRef.current = {
        px: e.clientX,
        py: e.clientY,
        left: sc.scrollLeft,
        top: sc.scrollTop,
      };
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      return;
    }
    const p = toImageCoords(e);
    if (!p) return;
    strokeRef.current = [p];
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (panMode) {
      const d = panDragRef.current;
      const sc = scrollRef.current;
      if (d && sc) {
        sc.scrollLeft = d.left - (e.clientX - d.px);
        sc.scrollTop = d.top - (e.clientY - d.py);
      }
      return;
    }
    const p = toImageCoords(e);
    if (p) setCursor(p);
    const stroke = strokeRef.current;
    if (stroke && p) stroke.push(p);
  };

  const endStroke = () => {
    if (panMode) {
      panDragRef.current = null;
      return;
    }
    const stroke = strokeRef.current;
    strokeRef.current = null;
    if (stroke && stroke.length > 0) commitStroke(stroke);
  };

  const undo = useCallback(() => {
    const prev = undoRef.current.pop();
    const keep = keepMaskRef.current;
    if (!prev || !keep) return;
    keep.set(prev);
    setCanUndo(undoRef.current.length > 0);
    repaint();
  }, [repaint]);

  const commit = useCallback(() => {
    const canvas = viewRef.current;
    if (!canvas) return;
    setBusy(true);
    canvas.toBlob(blob => {
      setBusy(false);
      if (blob) onCommit(blob);
      else setLoadError('Could not export the refined image.');
    }, 'image/png');
  }, [onCommit]);

  // Displayed size: fit the image into the viewport, then multiply by zoom.
  const { w, h } = dimsRef.current;

  return (
    <div className="flex h-full w-full flex-col bg-gray-100">
      {/* Controls bar (light — matches the modal + the real Studio brush). */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-3 py-2">
        <div className="flex overflow-hidden rounded-lg border border-gray-200">
          <button
            type="button"
            onClick={() => {
              setTool('keep');
              setPanMode(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium ${
              tool === 'keep' && !panMode
                ? 'bg-emerald-500 text-white'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Brush className="h-4 w-4" /> Keep
          </button>
          <button
            type="button"
            onClick={() => {
              setTool('remove');
              setPanMode(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium ${
              tool === 'remove' && !panMode
                ? 'bg-red-500 text-white'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Brush className="h-4 w-4" /> Remove
          </button>
        </div>

        <button
          type="button"
          onClick={() => setPanMode(p => !p)}
          className={`flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium ${
            panMode ? 'bg-gray-200 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
          }`}
          title="Pan"
        >
          <Hand className="h-4 w-4" /> Pan
        </button>

        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          title="Undo"
        >
          <Undo2 className="h-4 w-4" /> Undo
        </button>

        <div className="mx-1 h-6 w-px bg-gray-200" />

        <label className="flex items-center gap-2 text-xs text-gray-500">
          Size
          <input
            type="range"
            min={4}
            max={120}
            value={brushSize}
            onChange={e => setBrushSize(Number(e.target.value))}
            className="w-24 accent-blue-600"
          />
          <span className="w-6 tabular-nums text-gray-500">{brushSize}</span>
        </label>

        <div className="flex items-center rounded-full border border-gray-200 text-xs font-medium text-gray-600">
          <button
            type="button"
            onClick={() => setZoom(z => Math.max(1, z - 0.5))}
            className="px-2.5 py-1 hover:bg-gray-50"
            title="Zoom out"
          >
            −
          </button>
          <span className="select-none px-2 tabular-nums text-gray-500">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom(z => Math.min(6, z + 0.5))}
            className="px-2.5 py-1 hover:bg-gray-50"
            title="Zoom in"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={() => setSplitView(s => !s)}
          className={`flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium ${
            splitView ? 'bg-gray-200 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
          }`}
          title="Show the original alongside the cutout"
        >
          {splitView ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          Original
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          <X className="h-4 w-4" /> Cancel
        </button>
        <button
          type="button"
          onClick={commit}
          disabled={busy || !ready}
          className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Apply
        </button>
      </div>

      {/* Dual-panel body: editable cutout (left) + original reference (right). */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left — editable cutout (paint Keep/Remove here). */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <span className="absolute left-2 top-2 z-10 rounded bg-white/85 px-2 py-0.5 text-[11px] font-medium text-gray-600 shadow-sm backdrop-blur-sm">
            Edit — paint Keep / Remove
          </span>
          <div
            ref={scrollRef}
            className="relative flex-1 overflow-auto"
            style={{ background: CHECKER }}
          >
            {!ready && !loadError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
            {loadError && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                <p className="text-sm text-red-600">{loadError}</p>
              </div>
            )}
            <div className="flex min-h-full min-w-full items-center justify-center p-4">
              <div
                className="relative"
                style={
                  w && h
                    ? { width: `min(${w}px, ${zoom * 100}%)`, maxWidth: 'none' }
                    : undefined
                }
              >
                <canvas
                  ref={viewRef}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={endStroke}
                  onPointerCancel={endStroke}
                  onPointerLeave={() => setCursor(null)}
                  className="block h-auto w-full select-none rounded shadow"
                  style={{
                    touchAction: 'none',
                    cursor: panMode ? 'grab' : 'crosshair',
                    imageRendering: zoom > 1.5 ? 'pixelated' : 'auto',
                  }}
                />
                {!panMode && cursor && ready && w > 0 && (
                  <div
                    className="pointer-events-none absolute rounded-full border-2"
                    style={{
                      left: `${(cursor.x / w) * 100}%`,
                      top: `${(cursor.y / h) * 100}%`,
                      width: `${(brushSize / w) * 100}%`,
                      aspectRatio: '1 / 1',
                      transform: 'translate(-50%, -50%)',
                      borderColor: tool === 'keep' ? '#10b981' : '#ef4444',
                      background:
                        tool === 'keep'
                          ? 'rgba(16,185,129,0.15)'
                          : 'rgba(239,68,68,0.15)',
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right — original reference (the dual-panel display). */}
        {splitView && (
          <div className="relative flex min-h-0 flex-1 flex-col border-t border-gray-200 lg:border-l lg:border-t-0">
            <span className="absolute left-2 top-2 z-10 rounded bg-white/85 px-2 py-0.5 text-[11px] font-medium text-gray-600 shadow-sm backdrop-blur-sm">
              Original
            </span>
            <div
              className="relative flex flex-1 items-center justify-center overflow-hidden p-4"
              style={{ background: CHECKER }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={originalUrl}
                alt="Original"
                draggable={false}
                className="max-h-full max-w-full rounded object-contain shadow"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const CHECKER =
  'repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%) 50% / 20px 20px';
