'use client';

/**
 * Halftone tool — Studio plugin Panel (Phase 2.2).
 *
 * Pre-press style halftoning for DTF prints. Produces a transparent PNG
 * (opaque black dots over alpha 0) so RIP software handles the white
 * underbase downstream.
 *
 * Layout matches Upscale / Vectorize: shared StudioCanvasFrame on the
 * left with the working image, vertical right-hand sidebar with controls.
 * After Apply Halftone, the dot result becomes the working image and the
 * canvas top-left shows an Original / Halftone view-mode pill so the
 * user can compare.
 *
 * Tier-gated free-use vs credit-charge happens server-side via
 * /api/halftone/use, mirroring color-change/use. The Panel does the
 * pixel work locally — no upstream API, no per-call charge unless the
 * user is on Free / Basic and over their monthly quota.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

import {
  StudioCanvasFrame,
  CanvasProcessingOverlay,
} from '@/components/studio/StudioCanvasFrame';
import type { StudioToolPanelProps } from '../types';

import { thingDitherProvider } from './providers/thingDither';
import {
  amHalftoneProvider,
  effectiveDpi,
  extractLuminance,
  renderAmImageData,
  type LuminanceSource,
} from './providers/amHalftone';
import {
  DEFAULT_HALFTONE_OPTIONS,
  type ColorMode,
  type DotShape,
  type HalftoneAlgorithm,
  type HalftoneOptions,
  type OrderedSize,
} from './types';

type ViewMode = 'original' | 'halftone';

/** Interactive dot-editing tools (AM halftone only). */
type DotTool = 'none' | 'spread' | 'add' | 'subtract';

const ALGORITHMS: { value: HalftoneAlgorithm; label: string; help: string }[] =
  [
    {
      value: 'am-halftone',
      label: 'AM Halftone',
      help: 'True screening — real dots that grow with tone (LPI, angle, dot shape).',
    },
    {
      value: 'ordered',
      label: 'Ordered',
      help: 'Bayer matrix — regular dot pattern, production-consistent.',
    },
    {
      value: 'floyd-steinberg',
      label: 'Floyd-Steinberg',
      help: 'Error diffusion — natural gradient, classic photo halftone.',
    },
    {
      value: 'atkinson',
      label: 'Atkinson',
      help: 'Tighter, punchier dots — Macintosh-classic look.',
    },
  ];

const ORDERED_SIZES: { value: OrderedSize; label: string }[] = [
  { value: 16, label: 'Coarse' },
  { value: 8, label: 'Medium' },
  { value: 4, label: 'Fine' },
];

const DOT_SHAPES: { value: DotShape; label: string }[] = [
  { value: 'round', label: 'Round' },
  { value: 'ellipse', label: 'Ellipse' },
  { value: 'square', label: 'Square' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'line', label: 'Line' },
  { value: 'wave', label: 'Wave' },
  { value: 'cross', label: 'Cross' },
];

const COLOR_MODES: { value: ColorMode; label: string; help: string }[] = [
  { value: 'mono', label: 'Mono', help: 'Single ink colour.' },
  { value: 'source', label: 'Color', help: 'Dots keep the source colour.' },
  {
    value: 'cmyk',
    label: 'CMYK',
    help: 'Full-colour process — C/M/Y/K screens at their own angles.',
  },
];

/**
 * One-click "looks" layered over the AM engine — the designer-friendly entry
 * point (à la TheVectorLab's preset patterns). Each sets the AM parameters;
 * the user can still fine-tune the sliders after picking one.
 */
const PRESETS: { label: string; opts: Partial<HalftoneOptions> }[] = [
  {
    label: 'Classic',
    opts: { algorithm: 'am-halftone', dotShape: 'round', lpi: 45, angleDeg: 45 },
  },
  {
    label: 'Fine',
    opts: { algorithm: 'am-halftone', dotShape: 'round', lpi: 60, angleDeg: 45 },
  },
  {
    label: 'Bold',
    opts: { algorithm: 'am-halftone', dotShape: 'round', lpi: 28, angleDeg: 45 },
  },
  {
    label: 'Newsprint',
    opts: {
      algorithm: 'am-halftone',
      dotShape: 'round',
      lpi: 38,
      angleDeg: 15,
      contrast: 12,
    },
  },
  {
    label: 'Comic',
    opts: { algorithm: 'am-halftone', dotShape: 'round', lpi: 24, angleDeg: 0 },
  },
  {
    label: 'Line Screen',
    opts: { algorithm: 'am-halftone', dotShape: 'line', lpi: 50, angleDeg: 45 },
  },
];

interface UsageGate {
  remaining: number;
  limit: number;
  creditCharged: boolean;
}

interface HalftonePanelProps extends StudioToolPanelProps {
  /** Adapter wires this to /api/halftone/use so the panel can stay
   *  tier-aware without knowing about Supabase. */
  onCommit: (canvas: HTMLCanvasElement) => Promise<UsageGate>;
}

export function HalftonePanel({
  image,
  onApply,
  onCommit,
}: HalftonePanelProps) {
  const [opts, setOpts] = useState<HalftoneOptions>(DEFAULT_HALFTONE_OPTIONS);
  const [isProcessing, setIsProcessing] = useState(false); // Apply/commit
  const [isPreviewing, setIsPreviewing] = useState(false); // live re-render
  const [error, setError] = useState<string | null>(null);
  const [hasPreview, setHasPreview] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('original');
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<DotTool>('none');
  const [brushSize, setBrushSize] = useState(80);

  const isAm = opts.algorithm === 'am-halftone';

  // Refs for the interactive re-screen loop (stable across renders).
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null); // visible
  const latestCanvasRef = useRef<HTMLCanvasElement | null>(null); // full halftone → Apply
  const baseRef = useRef<LuminanceSource | null>(null); // source luminance
  const densityRef = useRef<Float32Array | null>(null); // committed dot edits
  const previewTokenRef = useRef(0);
  const hasPreviewRef = useRef(false);
  const optsRef = useRef(opts);
  const viewModeRef = useRef<ViewMode>(viewMode);
  const toolRef = useRef(tool);
  const brushSizeRef = useRef(brushSize);
  // Drag state for the tools.
  const isDrawingRef = useRef(false);
  const spreadAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const dragBaseDensityRef = useRef<Float32Array | null>(null); // density snapshot at drag start
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    optsRef.current = opts;
  }, [opts]);
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);
  useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSize]);

  // Draw the current halftone (or the original) into the visible canvas.
  const paintDisplay = useCallback(() => {
    const disp = displayCanvasRef.current;
    if (!disp) return;
    const ctx = disp.getContext('2d');
    if (!ctx) return;
    if (viewModeRef.current === 'original' || !latestCanvasRef.current) {
      const w = image.naturalWidth || image.width;
      const h = image.naturalHeight || image.height;
      disp.width = w;
      disp.height = h;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(image, 0, 0, w, h);
      return;
    }
    const src = latestCanvasRef.current;
    disp.width = src.width;
    disp.height = src.height;
    ctx.clearRect(0, 0, src.width, src.height);
    ctx.drawImage(src, 0, 0);
  }, [image]);

  // Re-screen the AM halftone from base + density into latestCanvasRef, then
  // repaint the display. `density` lets a live drag pass a temporary field.
  const rescreenAm = useCallback(
    (density?: Float32Array | null) => {
      const base = baseRef.current;
      if (!base) return;
      const imgData = renderAmImageData(
        base,
        optsRef.current,
        density ?? densityRef.current
      );
      let lc = latestCanvasRef.current;
      if (!lc || lc.width !== base.width || lc.height !== base.height) {
        lc = document.createElement('canvas');
        lc.width = base.width;
        lc.height = base.height;
        latestCanvasRef.current = lc;
      }
      lc.getContext('2d')?.putImageData(imgData, 0, 0);
      if (viewModeRef.current === 'halftone') paintDisplay();
    },
    [paintDisplay]
  );

  // The density field the next animation frame should screen. Updated on every
  // schedule call so a fast drag always renders its latest state (rAF coalesces
  // the calls, but the field must not be the stale first one).
  const renderFieldRef = useRef<Float32Array | null>(null);
  const scheduleRescreen = useCallback(
    (field?: Float32Array | null) => {
      renderFieldRef.current = field ?? densityRef.current;
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        rescreenAm(renderFieldRef.current);
      });
    },
    [rescreenAm]
  );

  // Extract luminance + reset the density field when the working image changes.
  useEffect(() => {
    try {
      baseRef.current = extractLuminance(image);
      densityRef.current = new Float32Array(
        baseRef.current.width * baseRef.current.height
      );
    } catch {
      baseRef.current = null;
      densityRef.current = null;
    }
    latestCanvasRef.current = null;
    hasPreviewRef.current = false;
    setHasPreview(false);
    setViewMode('original');
    viewModeRef.current = 'original';
    setTool('none');
    setError(null);
    paintDisplay();
  }, [image, paintDisplay]);

  // Keep the viewMode ref in sync and repaint on toggle.
  useEffect(() => {
    viewModeRef.current = viewMode;
    paintDisplay();
  }, [viewMode, paintDisplay]);

  const updateOption = useCallback(
    <K extends keyof HalftoneOptions>(key: K, value: HalftoneOptions[K]) => {
      setOpts(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  const applyPreset = useCallback((preset: Partial<HalftoneOptions>) => {
    setOpts(prev => ({ ...prev, ...preset }));
  }, []);

  // Render a non-interactive (dither) preview into latestCanvasRef + display.
  const renderDitherPreview = useCallback(async () => {
    const result = await thingDitherProvider.run(image, optsRef.current);
    latestCanvasRef.current = result.canvas;
    if (viewModeRef.current === 'halftone') paintDisplay();
  }, [image, paintDisplay]);

  // Live preview: re-render locally (NO credit gate / no Studio commit) a short
  // debounce after any option change. Only the explicit Apply charges/commits.
  useEffect(() => {
    const token = ++previewTokenRef.current;
    const handle = setTimeout(() => {
      setIsPreviewing(true);
      Promise.resolve()
        .then(async () => {
          if (isAm) rescreenAm();
          else await renderDitherPreview();
          if (token !== previewTokenRef.current) return;
          setError(null);
          if (!hasPreviewRef.current) {
            hasPreviewRef.current = true;
            setHasPreview(true);
            setViewMode('halftone');
          }
        })
        .catch(e => {
          if (token === previewTokenRef.current) {
            setError(e instanceof Error ? e.message : 'Halftone failed');
          }
        })
        .finally(() => {
          if (token === previewTokenRef.current) setIsPreviewing(false);
        });
    }, 180);
    return () => clearTimeout(handle);
  }, [opts, image, isAm, rescreenAm, renderDitherPreview]);

  const handleApply = useCallback(async () => {
    setError(null);
    setIsProcessing(true);
    try {
      const canvas = latestCanvasRef.current;
      if (!canvas) throw new Error('Nothing to apply yet');

      // Tier check / credit deduction — ONLY here, never on live preview.
      try {
        await onCommit(canvas);
      } catch (gateErr) {
        const msg =
          gateErr instanceof Error ? gateErr.message : 'Halftone gate failed';
        setError(msg);
        return;
      }

      onApply(canvas, {
        operation: 'halftone',
        provider: isAm ? amHalftoneProvider.id : thingDitherProvider.id,
        modelId: opts.algorithm,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Halftone failed';
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  }, [isAm, opts.algorithm, onApply, onCommit]);

  const resetDots = useCallback(() => {
    const base = baseRef.current;
    if (!base) return;
    densityRef.current = new Float32Array(base.width * base.height);
    rescreenAm();
  }, [rescreenAm]);

  // ---- Interactive dot editing (pointer handlers) ----
  const eventToImg = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
      const c = displayCanvasRef.current;
      if (!c) return null;
      const r = c.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return null;
      // getBoundingClientRect reflects the on-screen size (incl. zoom), so this
      // maps to internal image pixels regardless of CSS scale / transform.
      return {
        x: ((e.clientX - r.left) / r.width) * c.width,
        y: ((e.clientY - r.top) / r.height) * c.height,
      };
    },
    []
  );

  const BRUSH_STRENGTH = 0.28; // per-stamp density delta at the brush centre
  const SPREAD_STRENGTH = 0.85; // peak density added at the spread anchor

  // Stamp a soft disc of density into the committed field (brush add/subtract).
  const stampBrush = useCallback(
    (cx: number, cy: number, radius: number, strength: number) => {
      const dens = densityRef.current;
      const base = baseRef.current;
      if (!dens || !base) return;
      const { width: w, height: h } = base;
      const r = Math.max(1, radius);
      const r2 = r * r;
      const minX = Math.max(0, Math.floor(cx - r));
      const maxX = Math.min(w - 1, Math.ceil(cx + r));
      const minY = Math.max(0, Math.floor(cy - r));
      const maxY = Math.min(h - 1, Math.ceil(cy + r));
      for (let y = minY; y <= maxY; y++) {
        const dy = y - cy;
        for (let x = minX; x <= maxX; x++) {
          const dx = x - cx;
          const d2 = dx * dx + dy * dy;
          if (d2 > r2) continue;
          const i = y * w + x;
          let val = dens[i] + strength * (1 - Math.sqrt(d2) / r);
          if (val > 1) val = 1;
          else if (val < -1) val = -1;
          dens[i] = val;
        }
      }
    },
    []
  );

  // Radial spread from an anchor over `radius`, layered on the drag-start
  // snapshot. Denser at the anchor, fading to zero at the radius.
  const buildSpread = useCallback(
    (anchor: { x: number; y: number }, radius: number): Float32Array | null => {
      const snap = dragBaseDensityRef.current;
      const base = baseRef.current;
      if (!snap || !base) return null;
      const { width: w, height: h } = base;
      const out = new Float32Array(snap);
      const r = Math.max(1, radius);
      const r2 = r * r;
      const minX = Math.max(0, Math.floor(anchor.x - r));
      const maxX = Math.min(w - 1, Math.ceil(anchor.x + r));
      const minY = Math.max(0, Math.floor(anchor.y - r));
      const maxY = Math.min(h - 1, Math.ceil(anchor.y + r));
      for (let y = minY; y <= maxY; y++) {
        const dy = y - anchor.y;
        for (let x = minX; x <= maxX; x++) {
          const dx = x - anchor.x;
          const d2 = dx * dx + dy * dy;
          if (d2 > r2) continue;
          const i = y * w + x;
          let val = out[i] + SPREAD_STRENGTH * (1 - Math.sqrt(d2) / r);
          if (val > 1) val = 1;
          out[i] = val;
        }
      }
      return out;
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isAm || viewModeRef.current !== 'halftone') return;
      const t = toolRef.current;
      if (t === 'none') return;
      const p = eventToImg(e);
      if (!p) return;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      isDrawingRef.current = true;
      if (t === 'spread') {
        spreadAnchorRef.current = { x: p.x, y: p.y };
        dragBaseDensityRef.current = densityRef.current
          ? new Float32Array(densityRef.current)
          : null;
      } else {
        stampBrush(
          p.x,
          p.y,
          brushSizeRef.current,
          t === 'add' ? BRUSH_STRENGTH : -BRUSH_STRENGTH
        );
        scheduleRescreen();
      }
    },
    [isAm, eventToImg, stampBrush, scheduleRescreen]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;
      const p = eventToImg(e);
      if (!p) return;
      const t = toolRef.current;
      if (t === 'spread') {
        const anchor = spreadAnchorRef.current;
        if (!anchor) return;
        const radius = Math.hypot(p.x - anchor.x, p.y - anchor.y);
        const field = buildSpread(anchor, radius);
        if (field) scheduleRescreen(field);
      } else if (t === 'add' || t === 'subtract') {
        stampBrush(
          p.x,
          p.y,
          brushSizeRef.current,
          t === 'add' ? BRUSH_STRENGTH : -BRUSH_STRENGTH
        );
        scheduleRescreen();
      }
    },
    [eventToImg, stampBrush, buildSpread, scheduleRescreen]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      if (toolRef.current === 'spread') {
        const anchor = spreadAnchorRef.current;
        const p = eventToImg(e);
        if (anchor && p) {
          const radius = Math.hypot(p.x - anchor.x, p.y - anchor.y);
          const field = buildSpread(anchor, radius);
          if (field) densityRef.current = field; // commit
        }
        spreadAnchorRef.current = null;
        dragBaseDensityRef.current = null;
      }
      scheduleRescreen();
    },
    [eventToImg, buildSpread, scheduleRescreen]
  );

  // DPI awareness: effective print DPI derived from the image's pixel width
  // and the intended print width, and the resulting halftone dot pitch.
  const imgW = image.naturalWidth || image.width;
  const amDpi = Math.round(effectiveDpi(imgW, opts.printWidthIn));
  const amCellPx = opts.lpi > 0 ? amDpi / opts.lpi : 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="max-w-[1800px] mx-auto flex items-center gap-3">
            <p className="text-sm text-red-800 flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        <StudioCanvasFrame
          zoom={zoom}
          onZoomIn={() => setZoom(z => Math.min(z * 1.25, 8))}
          onZoomOut={() => setZoom(z => Math.max(z / 1.25, 0.1))}
          onFit={() => setZoom(1)}
          topBar={
            hasPreview ? (
              <>
                {(['original', 'halftone'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setViewMode(m)}
                    className={`px-3 py-1 transition-colors capitalize ${
                      viewMode === m
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </>
            ) : null
          }
        >
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center',
              lineHeight: 0,
            }}
          >
            <canvas
              ref={displayCanvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className={`max-w-full max-h-full shadow-lg rounded block ${
                isAm && viewMode === 'halftone' && tool !== 'none'
                  ? 'cursor-crosshair'
                  : ''
              }`}
              style={{
                maxHeight: 'calc(100vh - 280px)',
                touchAction:
                  isAm && viewMode === 'halftone' && tool !== 'none'
                    ? 'none'
                    : undefined,
              }}
            />
          </div>
          {isProcessing && <CanvasProcessingOverlay label="Applying…" />}
        </StudioCanvasFrame>

        <div className="w-full lg:w-72 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col overflow-y-auto">
          <div className="p-4 flex flex-col gap-4 flex-1">
            <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-900">
              <p className="font-medium mb-1 flex items-center gap-1.5">
                DTF Halftone
                <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded bg-amber-100 text-amber-700">
                  Alpha
                </span>
              </p>
              <p className="text-blue-800/90">
                Outputs a transparent PNG of black dots — your RIP software
                handles the white underbase.
              </p>
            </div>

            {/* Presets — one-click looks (designer entry point) */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Presets
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p.opts)}
                    disabled={isProcessing}
                    className="px-2.5 py-1 text-xs font-medium rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Algorithm
              </label>
              <div className="grid grid-cols-2 rounded-lg border border-gray-200 overflow-hidden">
                {ALGORITHMS.map(a => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => updateOption('algorithm', a.value)}
                    disabled={isProcessing}
                    className={`py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                      opts.algorithm === a.value
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {ALGORITHMS.find(a => a.value === opts.algorithm)?.help}
              </p>
            </div>

            {opts.algorithm === 'am-halftone' && (
              <>
                {/* Color mode */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    Color
                  </label>
                  <div className="grid grid-cols-3 rounded-lg border border-gray-200 overflow-hidden">
                    {COLOR_MODES.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => updateOption('colorMode', c.value)}
                        disabled={isProcessing}
                        className={`py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                          opts.colorMode === c.value
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {opts.colorMode === 'mono' && (
                      <input
                        type="color"
                        value={opts.inkColor}
                        onChange={e => updateOption('inkColor', e.target.value)}
                        disabled={isProcessing}
                        title="Ink color"
                        className="w-7 h-7 rounded border border-gray-200 bg-white p-0.5 cursor-pointer disabled:opacity-50"
                      />
                    )}
                    <p className="text-xs text-gray-400">
                      {COLOR_MODES.find(c => c.value === opts.colorMode)?.help}
                    </p>
                  </div>
                </div>

                {/* Dot shape */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    Dot Shape
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {DOT_SHAPES.map(s => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => updateOption('dotShape', s.value)}
                        disabled={isProcessing}
                        className={`py-1.5 text-xs font-medium rounded border transition-colors disabled:opacity-50 ${
                          opts.dotShape === s.value
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Print width → DPI awareness */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Print Width
                    </label>
                    <span className="text-xs text-gray-500 tabular-nums">
                      {opts.printWidthIn}&quot; · {amDpi} DPI
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={24}
                    step={0.5}
                    value={opts.printWidthIn}
                    onChange={e =>
                      updateOption('printWidthIn', Number(e.target.value))
                    }
                    disabled={isProcessing}
                    className="w-full accent-blue-600"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    The size you&apos;ll print this at. Sets the true DPI so LPI
                    is physically accurate.
                  </p>
                </div>

                {/* LPI (screen frequency) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Frequency (LPI)
                    </label>
                    <span className="text-xs text-gray-500 tabular-nums">
                      {opts.lpi} LPI · {amCellPx.toFixed(1)}px dots
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={1}
                    value={opts.lpi}
                    onChange={e => updateOption('lpi', Number(e.target.value))}
                    disabled={isProcessing}
                    className="w-full accent-blue-600"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Dots per inch of print. Lower = bigger, chunkier dots. DTF
                    prints well around 35–55 LPI.
                  </p>
                </div>

                {/* Screen angle */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Screen Angle
                    </label>
                    <span className="text-xs text-gray-500 tabular-nums">
                      {opts.angleDeg}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={90}
                    step={1}
                    value={opts.angleDeg}
                    onChange={e =>
                      updateOption('angleDeg', Number(e.target.value))
                    }
                    disabled={isProcessing}
                    className="w-full accent-blue-600"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    45° is the classic single-color angle (hides the grid).
                  </p>
                </div>

                {/* Texture / grunge */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Texture
                    </label>
                    <span className="text-xs text-gray-500 tabular-nums">
                      {opts.texture}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={opts.texture}
                    onChange={e =>
                      updateOption('texture', Number(e.target.value))
                    }
                    disabled={isProcessing}
                    className="w-full accent-blue-600"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Roughens the dots for a grunge / distressed screen-print
                    look. 0 = clean.
                  </p>
                </div>
              </>
            )}

            {opts.algorithm === 'ordered' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Dot Size
                </label>
                <div className="grid grid-cols-3 rounded-lg border border-gray-200 overflow-hidden">
                  {ORDERED_SIZES.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => updateOption('orderedSize', s.value)}
                      disabled={isProcessing}
                      className={`py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                        opts.orderedSize === s.value
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Coarse = chunky dots (low LPI). Fine = subtle, photo-like.
                </p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Threshold
                </label>
                <span className="text-xs text-gray-500 tabular-nums">
                  {opts.threshold}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={opts.threshold}
                onChange={e =>
                  updateOption('threshold', Number(e.target.value))
                }
                disabled={isProcessing}
                className="w-full accent-blue-600"
              />
              <p className="text-xs text-gray-400 mt-1">
                Bias the dot density. Lower = more black, higher = sparser.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Contrast
                </label>
                <span className="text-xs text-gray-500 tabular-nums">
                  {opts.contrast > 0 ? `+${opts.contrast}` : opts.contrast}
                </span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                step={1}
                value={opts.contrast}
                onChange={e => updateOption('contrast', Number(e.target.value))}
                disabled={isProcessing}
                className="w-full accent-blue-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Gamma
                </label>
                <span className="text-xs text-gray-500 tabular-nums">
                  {opts.gamma.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.05}
                value={opts.gamma}
                onChange={e => updateOption('gamma', Number(e.target.value))}
                disabled={isProcessing}
                className="w-full accent-blue-600"
              />
              <p className="text-xs text-gray-400 mt-1">
                &gt;1 lightens midtones, &lt;1 darkens them.
              </p>
            </div>

            {isAm && hasPreview && (
              <div className="border-t border-gray-100 pt-3">
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Edit Dots
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {(
                    [
                      ['none', 'Off'],
                      ['spread', 'Spread'],
                      ['add', 'Add'],
                      ['subtract', 'Erase'],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTool(val)}
                      disabled={isProcessing}
                      className={`py-1.5 text-xs font-medium rounded border transition-colors disabled:opacity-50 ${
                        tool === val
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {(tool === 'add' || tool === 'subtract') && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Brush Size
                      </label>
                      <span className="text-xs text-gray-500 tabular-nums">
                        {brushSize}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={300}
                      step={5}
                      value={brushSize}
                      onChange={e => setBrushSize(Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>
                )}

                <p className="text-xs text-gray-400 mt-1.5">
                  {tool === 'spread'
                    ? 'Click and drag from a point — dots spread outward from where you press.'
                    : tool === 'add'
                      ? 'Paint to grow dots (add ink).'
                      : tool === 'subtract'
                        ? 'Paint to shrink dots (open up highlights).'
                        : 'Pick a tool to hand-edit the dots right on the canvas.'}
                </p>

                <button
                  type="button"
                  onClick={resetDots}
                  disabled={isProcessing}
                  className="mt-2 w-full text-xs text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 rounded-lg py-1.5 transition-colors disabled:opacity-50"
                >
                  Reset dot edits
                </button>
              </div>
            )}

            <div className="flex items-center justify-center h-4">
              {isPreviewing && (
                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Updating preview…
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleApply}
              disabled={isProcessing || isPreviewing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Applying…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Apply Halftone
                </>
              )}
            </button>

            <p className="text-xs text-gray-400 pt-1">
              The preview updates live as you adjust. Apply commits it to your
              design. Free on Starter plans and above; Basic and Free plans pay
              1 credit per halftone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
