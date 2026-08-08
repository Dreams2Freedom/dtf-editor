'use client';

/**
 * Embed Studio — client-side edge-aware refine brush (BG removal workspace).
 *
 * Self-contained port of the real DTF Editor bg-removal brush: it reuses only
 * the PURE geometry from `@/lib/bg-brush/scribble` (no session/network/tool
 * coupling) and runs entirely in the browser. Single editing canvas with an
 * open (drag-to-pan, wheel/buttons-to-zoom) viewport, a live coloured stroke
 * overlay (green = Keep, red = Remove), and the real stroke pipeline
 * (background-partition fill + edge-aware grow fallback + feathered export).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, X, Loader2, Undo2, Hand, Brush } from 'lucide-react';
import {
  strokeToSeeds,
  growRegionFromStroke,
  fillConnectedRegion,
  computeBackgroundMask,
  detectBorderColor,
  featherAlpha,
} from '@/lib/bg-brush/scribble';

// Mirror the real DTF Editor Studio brush tuning exactly.
const GROW_SEED_RADIUS_DIVISOR = 4;
const GROW_MEDIUM_REACH_PER_SIZE = 18;
const GROW_EDGE_THRESHOLD = 40;
const GROW_FLOOD_COLOR_TOLERANCE = 115;
const REACH_REFERENCE_DIM = 1400;
const BG_CONNECT_TOLERANCE = 70;
const FEATHER_RADIUS = 1;
const ALPHA_KEEP_THRESHOLD = 16;
const MAX_UNDO = 25;

const CHECKER =
  'repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%) 50% / 20px 20px';

type Tool = 'keep' | 'remove';

interface Props {
  originalUrl: string;
  cutoutUrl: string;
  onCommit: (blob: Blob) => void;
  onCancel: () => void;
  /**
   * Register a "flush" callback the parent can call to export any UNSAVED brush
   * edits as a PNG (e.g. when the user switches tools, so the strokes carry
   * over without an explicit Apply). Resolves to null when there's nothing
   * unsaved. The parent uploads the blob and makes it the working image.
   */
  registerCommit?: (fn: (() => Promise<Blob | null>) | null) => void;
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

function pathToD(pts: Array<{ x: number; y: number }>): string {
  if (pts.length === 0) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x} ${pts[i].y}`;
  // A single tap needs a tiny segment to render as a round dot.
  if (pts.length === 1) d += ` L ${pts[0].x + 0.01} ${pts[0].y}`;
  return d;
}

export default function EmbedBrush({
  originalUrl,
  cutoutUrl,
  onCommit,
  onCancel,
  registerCommit,
}: Props) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('remove');
  const [brushSize, setBrushSize] = useState(24);
  const [panMode, setPanMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  // Open-canvas viewport: translate(pan) scale(zoom).
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });

  // Natural-resolution image data + working keep-mask.
  const dimsRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const origDataRef = useRef<Uint8ClampedArray | null>(null);
  const keepMaskRef = useRef<Uint8Array | null>(null);
  const undoRef = useRef<Uint8Array[]>([]);
  const bgMaskRef = useRef<Uint8Array | null>(null);
  // Unsaved edits since the last export (Apply or flush-on-switch).
  const dirtyRef = useRef(false);

  const viewRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const livePathRef = useRef<SVGPathElement | null>(null);
  const strokeRef = useRef<Array<{ x: number; y: number }> | null>(null);
  const dragRef = useRef<{
    px: number;
    py: number;
    panX: number;
    panY: number;
  } | null>(null);
  const brushSizeRef = useRef(brushSize);
  const toolRef = useRef(tool);
  const panModeRef = useRef(panMode);
  useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSize]);
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);
  useEffect(() => {
    panModeRef.current = panMode;
  }, [panMode]);

  const setViewport = useCallback(
    (z: number, p: { x: number; y: number }) => {
      zoomRef.current = z;
      panRef.current = p;
      setZoom(z);
      setPan(p);
    },
    []
  );

  // Composite preview (original RGB × feathered keep-mask alpha) onto the canvas.
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

  // Load original + cutout, build the pixel buffer and initial keep-mask.
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
        bgMaskRef.current = null;

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

  // Wheel to zoom (around the cursor), non-passive so we can preventDefault.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const next = Math.min(8, Math.max(1, zoomRef.current * factor));
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
  }, [ready, setViewport]);

  // Map a pointer event to image-pixel coordinates via the canvas's on-screen
  // rect (which already reflects the pan/zoom transform).
  const toImageCoords = useCallback((e: React.PointerEvent) => {
    const canvas = viewRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const { w, h } = dimsRef.current;
    return {
      x: ((e.clientX - rect.left) / rect.width) * w,
      y: ((e.clientY - rect.top) / rect.height) * h,
    };
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

      const seedRadius = Math.max(1, sizeAtCommit / GROW_SEED_RADIUS_DIVISOR);
      const seeds = strokeToSeeds(path, seedRadius, w, h);

      const resFactor = Math.max(1, Math.max(w, h) / REACH_REFERENCE_DIM);
      const reachRadius = Math.max(
        1,
        sizeAtCommit * GROW_MEDIUM_REACH_PER_SIZE * resFactor
      );

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
      let region = fillConnectedRegion(
        bgMask,
        passValue,
        w,
        h,
        seeds,
        reachRadius
      );

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

      const footprintRadius = Math.max(1, sizeAtCommit / 2);
      const footprint = strokeToSeeds(path, footprintRadius, w, h);
      for (const idx of footprint) region[idx] = 1;

      const before = Uint8Array.from(keep);
      undoRef.current.push(before);
      if (undoRef.current.length > MAX_UNDO) undoRef.current.shift();
      setCanUndo(true);

      if (toolAtCommit === 'keep') {
        for (let i = 0; i < total; i++) keep[i] = keep[i] | region[i];
      } else {
        for (let i = 0; i < total; i++) keep[i] = keep[i] & (region[i] ^ 1);
      }
      dirtyRef.current = true;
      repaint();
    },
    [repaint]
  );

  // Expose a flush callback so the parent can auto-save unsaved strokes when the
  // user switches tools (carry the refined cutout forward without an explicit
  // Apply). Resolves null when there's nothing unsaved.
  useEffect(() => {
    if (!registerCommit) return;
    const flush = () =>
      new Promise<Blob | null>(resolve => {
        const canvas = viewRef.current;
        if (!dirtyRef.current || !canvas) {
          resolve(null);
          return;
        }
        canvas.toBlob(blob => {
          dirtyRef.current = false;
          resolve(blob);
        }, 'image/png');
      });
    registerCommit(flush);
    return () => registerCommit(null);
  }, [registerCommit]);

  // ---- Pointer handling (draw or pan), all on the viewport container ----
  const onPointerDown = (e: React.PointerEvent) => {
    if (!ready || busy) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    if (panModeRef.current) {
      dragRef.current = {
        px: e.clientX,
        py: e.clientY,
        panX: panRef.current.x,
        panY: panRef.current.y,
      };
      setDragging(true);
      return;
    }
    const p = toImageCoords(e);
    if (!p) return;
    strokeRef.current = [p];
    if (livePathRef.current)
      livePathRef.current.setAttribute('d', pathToD([p]));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (panModeRef.current) {
      const d = dragRef.current;
      if (d) setViewport(zoomRef.current, {
        x: d.panX + (e.clientX - d.px),
        y: d.panY + (e.clientY - d.py),
      });
      return;
    }
    const p = toImageCoords(e);
    if (p) setCursor(p);
    const stroke = strokeRef.current;
    if (stroke && p) {
      stroke.push(p);
      if (livePathRef.current)
        livePathRef.current.setAttribute('d', pathToD(stroke));
    }
  };

  const endStroke = () => {
    if (panModeRef.current) {
      dragRef.current = null;
      setDragging(false);
      return;
    }
    const stroke = strokeRef.current;
    strokeRef.current = null;
    if (livePathRef.current) livePathRef.current.setAttribute('d', '');
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
      if (blob) {
        dirtyRef.current = false; // saved
        onCommit(blob);
      } else setLoadError('Could not export the refined image.');
    }, 'image/png');
  }, [onCommit]);

  const { w, h } = dimsRef.current;
  const strokeColor = tool === 'keep' ? '#10b981' : '#ef4444';

  return (
    <div className="flex h-full w-full flex-col bg-gray-100">
      {/* Control bar */}
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
            panMode
              ? 'bg-gray-200 text-gray-900'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
          title="Pan the canvas"
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
            onClick={() =>
              setViewport(Math.max(1, zoomRef.current / 1.25), panRef.current)
            }
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
            onClick={() =>
              setViewport(Math.min(8, zoomRef.current * 1.25), panRef.current)
            }
            className="px-2.5 py-1 hover:bg-gray-50"
            title="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setViewport(1, { x: 0, y: 0 })}
            className="border-l border-gray-200 px-2 py-1 hover:bg-gray-50"
            title="Fit"
          >
            Fit
          </button>
        </div>

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

      {/* Open-canvas viewport */}
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onPointerLeave={() => {
          setCursor(null);
          endStroke();
        }}
        className="relative flex flex-1 items-center justify-center overflow-hidden select-none"
        style={{
          background: CHECKER,
          touchAction: 'none',
          cursor: panMode
            ? dragging
              ? 'grabbing'
              : 'grab'
            : 'crosshair',
        }}
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

        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center',
            lineHeight: 0,
            willChange: 'transform',
          }}
        >
          <div className="relative">
            <canvas
              ref={viewRef}
              className="block rounded shadow"
              style={{
                maxHeight: 'calc(100vh - 220px)',
                maxWidth: '100%',
                imageRendering: zoom > 1.5 ? 'pixelated' : 'auto',
              }}
            />
            {/* Live coloured stroke overlay (green Keep / red Remove). */}
            {w > 0 && h > 0 && (
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox={`0 0 ${w} ${h}`}
                preserveAspectRatio="none"
              >
                <path
                  ref={livePathRef}
                  d=""
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={brushSize}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.55}
                />
              </svg>
            )}
            {/* Brush-size ring cursor (draw mode). */}
            {!panMode && cursor && ready && w > 0 && (
              <div
                className="pointer-events-none absolute rounded-full border-2"
                style={{
                  left: `${(cursor.x / w) * 100}%`,
                  top: `${(cursor.y / h) * 100}%`,
                  width: `${(brushSize / w) * 100}%`,
                  aspectRatio: '1 / 1',
                  transform: 'translate(-50%, -50%)',
                  borderColor: strokeColor,
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
  );
}
