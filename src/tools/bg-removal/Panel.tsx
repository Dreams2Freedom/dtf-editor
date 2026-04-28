'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Download,
  ExternalLink,
  Loader2,
  Save,
  RotateCcw,
  Pipette,
  Cpu,
  Wand2,
  Plus,
  Minus,
  Undo2,
  Trash2,
  Scissors,
  CheckCircle2,
} from 'lucide-react';

import MagicWand from '@/lib/magic-wand';
import {
  clientFloodFill,
  clientMultiFloodFill,
  samplePathPoints,
  useBackgroundRemoval,
} from './useBackgroundRemoval';
import type {
  BgRemovalModel,
  PanelMode,
  RGB,
  RemovalOptions,
  SamPoint,
} from './types';

interface BackgroundRemovalPanelProps {
  image: HTMLImageElement;
  onSave: (canvas: HTMLCanvasElement, provider: 'in-house') => Promise<void>;
  onCancel: () => void;
  savedImageId: string | null;
  advancedBgUrl?: string;
}

const STATUS_LABELS: Record<string, string> = {
  idle: '',
  authorizing: 'Checking plan...',
  detecting: 'Detecting background...',
  removing: 'Removing background...',
  embedding: 'Preparing AI Brush...',
  predicting: 'Updating mask...',
  done: 'Done!',
  error: '',
};

const MODELS: { value: BgRemovalModel; label: string }[] = [
  { value: 'bria-rmbg', label: 'Best Quality (BRIA AI)' },
  { value: 'birefnet-general-lite', label: 'Standard (BiRefNet)' },
  { value: 'birefnet-dis', label: 'High Detail (Graphics + Text)' },
  { value: 'birefnet-general', label: 'Maximum Quality (BiRefNet, slow)' },
  { value: 'birefnet-massive', label: 'Massive Dataset (BiRefNet, slow)' },
  { value: 'u2net', label: 'Fast (U2Net)' },
  { value: 'u2net_human_seg', label: 'People & Portraits' },
  { value: 'isnet-anime', label: 'Anime / Illustrations' },
];

function rgbToHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function pathToSvgD(
  path: Array<{ x: number; y: number }>,
  scale: number
): string {
  if (path.length === 0) return '';
  let d = `M ${(path[0].x * scale).toFixed(1)} ${(path[0].y * scale).toFixed(1)}`;
  for (let i = 1; i < path.length; i++) {
    d += ` L ${(path[i].x * scale).toFixed(1)} ${(path[i].y * scale).toFixed(1)}`;
  }
  return d;
}

/**
 * Trace the boundary of a binary mask and return a single SVG path `d`
 * string covering all contours (concatenated, each closed with Z).
 * Coordinates are in canvas-pixel (mask) space — render the SVG with
 * viewBox="0 0 width height" so the browser handles display scaling.
 * Returns '' for empty masks.
 */
function maskToContoursPath(
  mask: Uint8Array,
  width: number,
  height: number
): string {
  if (mask.length !== width * height) return '';
  const wandMask = {
    data: mask,
    width,
    height,
    bounds: { minX: 0, minY: 0, maxX: width - 1, maxY: height - 1 },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wand = MagicWand as any;
  const contours = wand.traceContours(wandMask) as Array<{
    points: Array<{ x: number; y: number }>;
    inner: boolean;
    label: number;
  }>;
  if (contours.length === 0) return '';
  // Simplify (Douglas-Peucker) to keep SVG DOM small.
  const simplified = wand.simplifyContours
    ? (wand.simplifyContours(contours, 0.75, 6) as typeof contours)
    : contours;
  const parts: string[] = [];
  for (const c of simplified) {
    const pts = c.points;
    if (!pts || pts.length === 0) continue;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i].x} ${pts[i].y}`;
    }
    d += ' Z';
    parts.push(d);
  }
  return parts.join(' ');
}

/**
 * After SAM produces a kept region, refine the mask using user-supplied
 * color hints: any kept pixel whose color is closer to a Remove-stroke
 * sample than to a Keep-stroke sample (within tolerance) is removed.
 * No-op unless both palettes are non-empty. `tolerance` is in linear
 * RGB-distance units (0-100ish); the function squares it internally.
 */
function applyColorCleanup(
  mask: Uint8Array,
  orig: ImageData,
  keepColors: Array<[number, number, number]>,
  removeColors: Array<[number, number, number]>,
  tolerance: number
): void {
  if (tolerance <= 0) return;
  if (keepColors.length === 0 || removeColors.length === 0) return;
  const TOL_SQ = tolerance * tolerance;
  const data = orig.data;
  const total = mask.length;
  for (let i = 0; i < total; i++) {
    if (mask[i] === 0) continue;
    const j = i * 4;
    const r = data[j];
    const g = data[j + 1];
    const b = data[j + 2];

    let dK = Infinity;
    for (let k = 0; k < keepColors.length; k++) {
      const c = keepColors[k];
      const dr = r - c[0];
      const dg = g - c[1];
      const db = b - c[2];
      const d = dr * dr + dg * dg + db * db;
      if (d < dK) dK = d;
    }

    let dR = Infinity;
    for (let k = 0; k < removeColors.length; k++) {
      const c = removeColors[k];
      const dr = r - c[0];
      const dg = g - c[1];
      const db = b - c[2];
      const d = dr * dr + dg * dg + db * db;
      if (d < dR) dR = d;
    }

    if (dR < dK && dR < TOL_SQ) mask[i] = 0;
  }
}

/**
 * Sample colors densely from a stroke's raw mouse path.
 * For each point along the path (every 2 pixels) we grab a 3×3 neighborhood
 * (9 pixels per sample), then dedupe via 4-bit-per-channel quantization
 * so the palette stays small (typically 20–80 unique colors per stroke).
 *
 * This catches anti-aliased fringe colors that a sparse one-pixel-per-SAM-point
 * sample would miss — the main complaint that AI Brush "only sees black"
 * when the stroke visibly sweeps across both black and gray fringe.
 */
function collectStrokePaletteColors(
  history: Array<{
    tool: 'keep' | 'remove';
    rawPath?: Array<{ x: number; y: number }>;
    points: { x: number; y: number; label: 0 | 1 }[];
  }>,
  tool: 'keep' | 'remove',
  orig: ImageData
): Array<[number, number, number]> {
  const w = orig.width;
  const h = orig.height;
  const data = orig.data;
  const seen = new Set<number>();
  const out: Array<[number, number, number]> = [];

  const addPixel = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const j = (y * w + x) * 4;
    const r = data[j];
    const g = data[j + 1];
    const b = data[j + 2];
    // 4 bits/channel quantization → 16³ = 4096 buckets
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    if (seen.has(key)) return;
    seen.add(key);
    out.push([r, g, b]);
  };

  for (const s of history) {
    if (s.tool !== tool) continue;
    // Prefer rawPath (dense). Fall back to SAM points if rawPath missing.
    const path =
      s.rawPath && s.rawPath.length > 0
        ? s.rawPath
        : s.points.map(p => ({ x: p.x, y: p.y }));

    let lastX = -999;
    let lastY = -999;
    for (let i = 0; i < path.length; i++) {
      const px = Math.round(path[i].x);
      const py = Math.round(path[i].y);
      // Stride: skip points within 2 pixels of the last sampled point
      const dx = px - lastX;
      const dy = py - lastY;
      if (dx * dx + dy * dy < 4) continue;
      lastX = px;
      lastY = py;
      // 3×3 neighborhood
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          addPixel(px + ox, py + oy);
        }
      }
    }
  }
  return out;
}

export function BackgroundRemovalPanel({
  image,
  onSave,
  onCancel,
  savedImageId,
  advancedBgUrl,
}: BackgroundRemovalPanelProps) {
  // Canvases & cached image data
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const originalDataRef = useRef<ImageData | null>(null);
  const initialMaskRef = useRef<ImageData | null>(null);

  // Color-pick state
  const toleranceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tolerance, setTolerance] = useState(30);
  const [targetColor, setTargetColor] = useState<RGB | null>(null);
  const [clickRemoveMode, setClickRemoveMode] = useState(false);
  // Multi-color (Phase 1.14): user-built remove + keep palettes for Color Pick mode
  const [removeColors, setRemoveColors] = useState<RGB[]>([]);
  const [keepColors, setKeepColors] = useState<RGB[]>([]);
  const [pickTool, setPickTool] = useState<'remove' | 'keep'>('remove');

  // AI Brush state
  type BrushTool = 'keep' | 'remove';
  interface StrokeRecord {
    tool: BrushTool;
    points: SamPoint[];
    rawPath: Array<{ x: number; y: number }>;
    brushSize: number;
    maskBefore: Uint8Array;
  }
  const [strokeHistory, setStrokeHistory] = useState<StrokeRecord[]>([]);
  const strokeHistoryRef = useRef<StrokeRecord[]>([]);
  // samMaskRef: SAM-only mask (pre-cleanup). Updated by stroke unions/diffs.
  const samMaskRef = useRef<Uint8Array | null>(null);
  // cumulativeMaskRef: post-cleanup mask, derived from samMaskRef via recomputeCumulative.
  const cumulativeMaskRef = useRef<Uint8Array | null>(null);
  const [brushTool, setBrushTool] = useState<BrushTool>('keep');
  const [brushSize, setBrushSize] = useState(20);
  const [cleanupTolerance, setCleanupTolerance] = useState(60);
  const [viewMode, setViewMode] = useState<'cutout' | 'preview' | 'original'>(
    'cutout'
  );
  const viewModeRef = useRef<'cutout' | 'preview' | 'original'>('cutout');
  const [contoursD, setContoursD] = useState<string>('');
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<Array<{ x: number; y: number }>>([]);
  const livePathRef = useRef<SVGPathElement | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [canvasRect, setCanvasRect] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // Zoom & pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const isSpaceHeldRef = useRef(false);
  const canvasZoomWrapperRef = useRef<HTMLDivElement | null>(null);
  // Pointer-event bookkeeping: active pointers, gesture start, pan-drag start
  const activePointersRef = useRef<
    Map<number, { x: number; y: number; type: string }>
  >(new Map());
  const gestureStartRef = useRef<{
    dist: number;
    midX: number;
    midY: number;
    zoom: number;
    pan: { x: number; y: number };
    rectLeft: number;
    rectTop: number;
  } | null>(null);
  const panDragStartRef = useRef<{
    clientX: number;
    clientY: number;
    panX: number;
    panY: number;
  } | null>(null);
  const lastPointerTypeRef = useRef<string>('mouse');

  // Common state
  const [panelMode, setPanelMode] = useState<PanelMode>('ai-brush');
  const [model, setModel] = useState<BgRemovalModel>('bria-rmbg');
  const [isSaving, setIsSaving] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  const {
    status,
    error,
    samSession,
    runDetect,
    runRemoval,
    runEmbed,
    runPredictRaw,
    reset,
  } = useBackgroundRemoval();

  // Track preview's UN-transformed layout size via ResizeObserver. Using
  // `contentRect` (not getBoundingClientRect) is critical: contentRect is
  // the layout size in CSS pixels, BEFORE CSS transforms are applied. SVG
  // overlays live inside the zoom transform, so they should be sized in
  // un-zoomed pixels — the transform multiplies them visually.
  useEffect(() => {
    const p = previewRef.current;
    if (!p || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        if (cr.width > 0 && cr.height > 0) {
          setCanvasRect({ width: cr.width, height: cr.height });
        }
      }
    });
    ro.observe(p);
    // Initial measurement (may report 0 first paint if canvas not yet sized)
    const r = p.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      setCanvasRect({ width: r.width, height: r.height });
    }
    return () => ro.disconnect();
  }, []);

  // Detect upgrade-required errors
  useEffect(() => {
    if (
      error &&
      (error.includes('403') || error.toLowerCase().includes('upgrade'))
    ) {
      setUpgradeRequired(true);
    }
  }, [error]);

  // ---------- Color Pick: client-side flood-fill preview ----------
  /**
   * Recompute the Color Pick preview based on current palettes + tolerance
   * (and optional seed point). Uses multi-color flood-fill when at least one
   * palette is non-empty; falls back to single-color flood-fill otherwise.
   */
  const refreshColorPickPreview = useCallback(
    (
      removePalette: RGB[],
      keepPalette: RGB[],
      tol: number,
      seedPoint?: { x: number; y: number } | null,
      legacyColor?: RGB
    ) => {
      const orig = originalDataRef.current;
      const preview = previewRef.current;
      if (!orig || !preview || hasResult) return;
      const cloned = new ImageData(
        new Uint8ClampedArray(orig.data),
        orig.width,
        orig.height
      );
      if (removePalette.length > 0) {
        clientMultiFloodFill(
          cloned,
          removePalette,
          keepPalette,
          tol,
          seedPoint ?? null
        );
      } else if (legacyColor) {
        clientFloodFill(cloned, legacyColor, tol, seedPoint ?? null);
      } else {
        // Nothing to do — render the original
        const pCtx0 = preview.getContext('2d');
        if (pCtx0) {
          pCtx0.clearRect(0, 0, preview.width, preview.height);
          pCtx0.putImageData(orig, 0, 0);
        }
        return;
      }
      const pCtx = preview.getContext('2d');
      if (!pCtx) return;
      pCtx.clearRect(0, 0, preview.width, preview.height);
      pCtx.putImageData(cloned, 0, 0);
    },
    [hasResult]
  );
  // Legacy alias kept for callers expecting the old signature
  const applyClientPreview = useCallback(
    (color: RGB, tol: number, seedPoint?: { x: number; y: number } | null) => {
      refreshColorPickPreview([], [], tol, seedPoint, color);
    },
    [refreshColorPickPreview]
  );

  const handleToleranceChange = useCallback(
    (val: number) => {
      setTolerance(val);
      if (panelMode !== 'color-pick' || hasResult) return;
      const havePalette = removeColors.length > 0;
      if (!havePalette && !targetColor) return;
      if (toleranceTimerRef.current) clearTimeout(toleranceTimerRef.current);
      toleranceTimerRef.current = setTimeout(() => {
        refreshColorPickPreview(
          removeColors,
          keepColors,
          val,
          null,
          targetColor ?? undefined
        );
      }, 200);
    },
    [
      panelMode,
      hasResult,
      targetColor,
      removeColors,
      keepColors,
      refreshColorPickPreview,
    ]
  );

  // ---------- Coordinate mapping ----------
  const eventToCanvasCoords = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const preview = previewRef.current;
      if (!preview) return null;
      const rect = preview.getBoundingClientRect();
      const sx = preview.width / rect.width;
      const sy = preview.height / rect.height;
      const x = (e.clientX - rect.left) * sx;
      const y = (e.clientY - rect.top) * sy;
      return {
        x,
        y,
        displayX: e.clientX - rect.left,
        displayY: e.clientY - rect.top,
      };
    },
    []
  );

  // ---------- AI Brush: cumulative mask + dual-layer rendering ----------

  /**
   * Render preview based on viewMode (read from ref so this callback stays stable):
   * - 'cutout' (default): kept = original alpha, removed = faded (≤76, ~30%)
   * - 'preview': kept = original alpha, removed = 0 (final-result preview, transparent)
   * - 'original': original at full alpha, mask not applied
   */
  const renderPreviewFromMask = useCallback((mask: Uint8Array) => {
    const orig = originalDataRef.current;
    const p = previewRef.current;
    if (!orig || !p) return;
    const pCtx = p.getContext('2d');
    if (!pCtx) return;
    const w = orig.width;
    const h = orig.height;
    pCtx.clearRect(0, 0, w, h);
    const mode = viewModeRef.current;
    if (mode === 'original') {
      pCtx.putImageData(orig, 0, 0);
      return;
    }
    if (mask.length !== w * h) return;
    const out = new ImageData(new Uint8ClampedArray(orig.data), w, h);
    const od = out.data;
    const src = orig.data;
    if (mode === 'preview') {
      for (let i = 0; i < mask.length; i++) {
        od[i * 4 + 3] = mask[i] ? src[i * 4 + 3] : 0;
      }
    } else {
      // cutout: faded for removed
      for (let i = 0; i < mask.length; i++) {
        const a = src[i * 4 + 3];
        od[i * 4 + 3] = mask[i] ? a : Math.min(a, 76);
      }
    }
    pCtx.putImageData(out, 0, 0);
  }, []);

  // Sync viewMode state → ref AND re-render preview on change.
  useEffect(() => {
    viewModeRef.current = viewMode;
    const mask = cumulativeMaskRef.current;
    if (mask) renderPreviewFromMask(mask);
  }, [viewMode, renderPreviewFromMask]);

  /**
   * Kick off the AI pipeline (SAM embed + smart initial mask via BRIA + auto color-fill).
   * Called on mount AND from handleReset so "Reset to original" re-runs the analysis.
   * NOTE: must be declared AFTER renderPreviewFromMask to avoid TDZ on the deps array.
   */
  const runInitialAnalysis = useCallback(
    (canvas: HTMLCanvasElement) => {
      // SAM encoder loads in parallel; brush is interactive when this resolves.
      runEmbed(canvas);
      // Smart initial mask: detect → ml+color when bg is flood-fillable.
      return runDetect(canvas)
        .then(detection => {
          const opts: RemovalOptions = (() => {
            if (
              !detection ||
              detection.recommended_mode === 'ml-only' ||
              detection.recommended_mode === 'noop'
            ) {
              return { mode: 'ml-only', model: 'bria-rmbg' };
            }
            return {
              mode: 'ml+color',
              model: 'bria-rmbg',
              targetColor: detection.dominant,
              tolerance: 30,
            };
          })();
          return runRemoval(canvas, opts);
        })
        .then(img => {
          const orig = originalDataRef.current;
          if (!img || !orig) return;
          const off = document.createElement('canvas');
          off.width = orig.width;
          off.height = orig.height;
          const offCtx = off.getContext('2d');
          if (!offCtx) return;
          offCtx.drawImage(img, 0, 0, orig.width, orig.height);
          const data = offCtx.getImageData(0, 0, orig.width, orig.height);
          initialMaskRef.current = data;
          // Only seed SAM mask if user hasn't started brushing yet.
          if (strokeHistoryRef.current.length === 0) {
            const m = new Uint8Array(orig.width * orig.height);
            for (let i = 0; i < m.length; i++) {
              m[i] = data.data[i * 4 + 3] > 127 ? 1 : 0;
            }
            samMaskRef.current = m;
            const next = new Uint8Array(m);
            cumulativeMaskRef.current = next;
            renderPreviewFromMask(next);
            setContoursD(maskToContoursPath(next, orig.width, orig.height));
          }
        });
    },
    [runEmbed, runDetect, runRemoval, renderPreviewFromMask]
  );

  // Init canvas, kick off analysis on mount.
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const w = image.naturalWidth || image.width;
    const h = image.naturalHeight || image.height;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(image, 0, 0);
    canvasRef.current = canvas;
    originalDataRef.current = ctx.getImageData(0, 0, w, h);

    const preview = previewRef.current;
    if (preview) {
      preview.width = w;
      preview.height = h;
      const pCtx = preview.getContext('2d');
      if (pCtx) pCtx.drawImage(canvas, 0, 0);
    }

    runInitialAnalysis(canvas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image]);

  /** Derive post-cleanup mask from samMaskRef + current palettes + current tolerance, then render. */
  const recomputeCumulative = useCallback(() => {
    const sam = samMaskRef.current;
    const orig = originalDataRef.current;
    if (!sam || !orig) return;
    const next = new Uint8Array(sam);
    const keepColors = collectStrokePaletteColors(
      strokeHistoryRef.current,
      'keep',
      orig
    );
    const removeColors = collectStrokePaletteColors(
      strokeHistoryRef.current,
      'remove',
      orig
    );
    applyColorCleanup(next, orig, keepColors, removeColors, cleanupTolerance);
    cumulativeMaskRef.current = next;
    renderPreviewFromMask(next);
    // Trace mask boundary for the marching-ants overlay (canvas-pixel coords).
    setContoursD(maskToContoursPath(next, orig.width, orig.height));
  }, [cleanupTolerance, renderPreviewFromMask]);

  /** Reset SAM mask to BiRefNet initial (or all-zeros if not loaded), then derive cumulative. */
  const resetCumulativeToInitial = useCallback(() => {
    const orig = originalDataRef.current;
    if (!orig) return;
    const total = orig.width * orig.height;
    const initial = initialMaskRef.current;
    const m = new Uint8Array(total);
    if (initial && initial.data.length === total * 4) {
      for (let i = 0; i < total; i++) {
        m[i] = initial.data[i * 4 + 3] > 127 ? 1 : 0;
      }
    }
    samMaskRef.current = m;
    recomputeCumulative();
  }, [recomputeCumulative]);

  // Debounced re-cleanup when tolerance slider changes (skip until samMask exists).
  useEffect(() => {
    if (!samMaskRef.current) return;
    const handle = setTimeout(() => {
      recomputeCumulative();
    }, 80);
    return () => clearTimeout(handle);
  }, [cleanupTolerance, recomputeCumulative]);

  const commitStroke = useCallback(
    async (
      tool: BrushTool,
      path: Array<{ x: number; y: number }>,
      sizeAtCommit: number
    ) => {
      if (path.length === 0) return;
      const orig = originalDataRef.current;
      if (!orig) return;
      const total = orig.width * orig.height;

      const sampled = samplePathPoints(path, sizeAtCommit);
      const label: 0 | 1 = tool === 'keep' ? 1 : 0;
      const points: SamPoint[] = sampled.map(p => ({
        x: Math.round(p.x),
        y: Math.round(p.y),
        label,
      }));
      if (points.length === 0) return;

      // Snapshot pre-cleanup SAM mask BEFORE this stroke (for undo).
      const currentSam = samMaskRef.current ?? new Uint8Array(total);
      const maskBefore = new Uint8Array(currentSam);

      const result = await runPredictRaw(points);
      if (!result) return;
      const { mask: samMask, width: rw, height: rh } = result;
      if (rw !== orig.width || rh !== orig.height || samMask.length !== total) {
        console.warn('SAM mask dimensions mismatch; ignoring stroke');
        return;
      }

      // Apply union (Keep) or difference (Remove) to the SAM-only mask.
      const nextSam = new Uint8Array(currentSam);
      if (tool === 'keep') {
        for (let i = 0; i < total; i++) nextSam[i] = nextSam[i] | samMask[i];
      } else {
        for (let i = 0; i < total; i++)
          nextSam[i] = nextSam[i] & (samMask[i] ^ 1);
      }

      const record: StrokeRecord = {
        tool,
        points,
        rawPath: path.slice(),
        brushSize: sizeAtCommit,
        maskBefore,
      };
      const updatedHistory = [...strokeHistoryRef.current, record];

      samMaskRef.current = nextSam;
      strokeHistoryRef.current = updatedHistory;
      setStrokeHistory(updatedHistory);
      // Derive cumulative (post-cleanup) and render
      recomputeCumulative();
    },
    [runPredictRaw, recomputeCumulative]
  );

  // ---------- Canvas pointer handlers (mouse + touch + pen) + zoom/pan ----------
  // Compute scale from canvas-pixel space → SVG display space
  const overlayScaleNow = useCallback(() => {
    const p = previewRef.current;
    if (!p || !canvasRect || !p.width) return 1;
    return canvasRect.width / p.width;
  }, [canvasRect]);

  const clampZoom = (z: number) => Math.max(0.25, Math.min(8, z));

  const cancelInProgressStroke = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    currentStrokeRef.current = [];
    const live = livePathRef.current;
    if (live) live.setAttribute('d', '');
  }, []);

  const endStroke = useCallback(() => {
    if (!isDrawingRef.current) return;
    const path = currentStrokeRef.current;
    const sizeAtCommit = brushSize;
    const toolAtCommit = brushTool;
    isDrawingRef.current = false;
    currentStrokeRef.current = [];
    const live = livePathRef.current;
    if (live) live.setAttribute('d', '');
    commitStroke(toolAtCommit, path, sizeAtCommit);
  }, [commitStroke, brushTool, brushSize]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (hasResult) return;
      if (panelMode === 'color-pick') return; // handled by onClick
      if (panelMode !== 'ai-brush') return;
      lastPointerTypeRef.current = e.pointerType;
      if (e.pointerType === 'touch') setCursorPos(null);

      // Track pointer
      activePointersRef.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        type: e.pointerType,
      });
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      const activeCount = activePointersRef.current.size;

      // Two pointers down → start pinch/pan gesture; cancel any in-progress stroke
      if (activeCount === 2) {
        cancelInProgressStroke();
        const pts = Array.from(activePointersRef.current.values());
        const dx = pts[1].x - pts[0].x;
        const dy = pts[1].y - pts[0].y;
        const dist = Math.hypot(dx, dy) || 1;
        const wrapper = canvasZoomWrapperRef.current;
        const rect = wrapper?.getBoundingClientRect();
        gestureStartRef.current = {
          dist,
          midX: (pts[0].x + pts[1].x) / 2,
          midY: (pts[0].y + pts[1].y) / 2,
          zoom,
          pan: { ...pan },
          rectLeft: rect?.left ?? 0,
          rectTop: rect?.top ?? 0,
        };
        return;
      }

      // Single pointer + spacebar → pan drag (desktop only)
      if (isSpaceHeldRef.current) {
        panDragStartRef.current = {
          clientX: e.clientX,
          clientY: e.clientY,
          panX: pan.x,
          panY: pan.y,
        };
        return;
      }

      if (!samSession) return;
      const c = eventToCanvasCoords(e);
      if (!c) return;
      isDrawingRef.current = true;
      currentStrokeRef.current = [{ x: c.x, y: c.y }];
      const live = livePathRef.current;
      if (live) {
        const scale = overlayScaleNow();
        live.setAttribute('d', pathToSvgD(currentStrokeRef.current, scale));
        live.setAttribute(
          'stroke',
          brushTool === 'keep' ? '#10b981' : '#ef4444'
        );
        live.setAttribute('stroke-width', String(brushSize * scale * zoom));
      }
    },
    [
      hasResult,
      panelMode,
      samSession,
      eventToCanvasCoords,
      brushTool,
      brushSize,
      overlayScaleNow,
      pan,
      zoom,
      cancelInProgressStroke,
    ]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      // Update tracked pointer
      if (activePointersRef.current.has(e.pointerId)) {
        activePointersRef.current.set(e.pointerId, {
          x: e.clientX,
          y: e.clientY,
          type: e.pointerType,
        });
      }

      // Two-pointer pinch/pan in progress
      if (activePointersRef.current.size === 2 && gestureStartRef.current) {
        const pts = Array.from(activePointersRef.current.values());
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1;
        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;
        const start = gestureStartRef.current;
        const newZoom = clampZoom(start.zoom * (dist / start.dist));
        // Zoom-toward-start-midpoint correction (using start rect, not current).
        const factor = newZoom / start.zoom;
        const dxZoom = (start.midX - start.rectLeft) * (1 - factor);
        const dyZoom = (start.midY - start.rectTop) * (1 - factor);
        // Plus pan from midpoint translation since gesture start.
        const dxPan = midX - start.midX;
        const dyPan = midY - start.midY;
        setZoom(newZoom);
        setPan({
          x: start.pan.x + dxZoom + dxPan,
          y: start.pan.y + dyZoom + dyPan,
        });
        return;
      }

      // Pan drag (spacebar + mouse)
      if (panDragStartRef.current) {
        const start = panDragStartRef.current;
        setPan({
          x: start.panX + (e.clientX - start.clientX),
          y: start.panY + (e.clientY - start.clientY),
        });
        return;
      }

      // Cursor / brush move
      const c = eventToCanvasCoords(e);
      if (!c) return;
      if (
        panelMode === 'ai-brush' &&
        e.pointerType === 'mouse' &&
        !isSpaceHeldRef.current
      ) {
        setCursorPos({ x: c.displayX, y: c.displayY });
      }
      if (!isDrawingRef.current) return;
      currentStrokeRef.current.push({ x: c.x, y: c.y });
      const live = livePathRef.current;
      if (live) {
        const scale = overlayScaleNow();
        live.setAttribute('d', pathToSvgD(currentStrokeRef.current, scale));
      }
    },
    [panelMode, eventToCanvasCoords, overlayScaleNow]
  );

  const handlePointerEnd = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      activePointersRef.current.delete(e.pointerId);

      // Exit gesture mode if we drop below 2 pointers
      if (gestureStartRef.current && activePointersRef.current.size < 2) {
        gestureStartRef.current = null;
      }

      // End pan drag
      if (panDragStartRef.current) {
        panDragStartRef.current = null;
        return;
      }

      // End brush stroke
      endStroke();
    },
    [endStroke]
  );

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.pointerType === 'mouse') setCursorPos(null);
      // On leave, only end if no remaining pointers / not gesture / not pan-drag
      if (activePointersRef.current.size === 0) endStroke();
    },
    [endStroke]
  );

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      activePointersRef.current.delete(e.pointerId);
      gestureStartRef.current = null;
      panDragStartRef.current = null;
      cancelInProgressStroke();
    },
    [cancelInProgressStroke]
  );

  // ---------- Wheel zoom (desktop) ----------
  // Attach native (non-passive) wheel listener so preventDefault actually works.
  useEffect(() => {
    const wrapper = canvasZoomWrapperRef.current;
    if (!wrapper) return;
    const handler = (e: WheelEvent) => {
      if (panelMode !== 'ai-brush' || hasResult) return;
      e.preventDefault();
      const rect = wrapper.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newZoom = clampZoom(zoom * factor);
      if (newZoom === zoom) return;
      const dx = (e.clientX - rect.left) * (1 - newZoom / zoom);
      const dy = (e.clientY - rect.top) * (1 - newZoom / zoom);
      setZoom(newZoom);
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    };
    wrapper.addEventListener('wheel', handler, { passive: false });
    return () => wrapper.removeEventListener('wheel', handler);
  }, [zoom, panelMode, hasResult]);

  // ---------- Spacebar pan-mode (desktop) ----------
  useEffect(() => {
    const isFormField = (el: EventTarget | null) =>
      el instanceof HTMLElement &&
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isFormField(e.target)) return;
      e.preventDefault();
      isSpaceHeldRef.current = true;
      setIsSpaceHeld(true);
      // Cancel any cursor circle while panning
      setCursorPos(null);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      isSpaceHeldRef.current = false;
      setIsSpaceHeld(false);
      // If a pan-drag is mid-flight, end it.
      panDragStartRef.current = null;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // ---------- Zoom controls ----------
  const handleZoomIn = useCallback(() => {
    setZoom(z => clampZoom(z * 1.25));
  }, []);
  const handleZoomOut = useCallback(() => {
    setZoom(z => clampZoom(z / 1.25));
  }, []);
  const handleZoomFit = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Color-pick click (eyedropper or seed-fill). Dispatches based on pickTool:
  //   'remove' → append color to removeColors palette
  //   'keep'   → append color to keepColors palette
  // If clickRemoveMode is active, BFS seeds from this point instead of the edges.
  const handlePreviewClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (panelMode !== 'color-pick' || hasResult) return;
      const orig = originalDataRef.current;
      const c = eventToCanvasCoords(e);
      if (!orig || !c) return;
      const x = Math.floor(c.x);
      const y = Math.floor(c.y);
      const idx = (y * orig.width + x) * 4;
      const color: RGB = [
        orig.data[idx],
        orig.data[idx + 1],
        orig.data[idx + 2],
      ];

      if (clickRemoveMode) {
        // Seed-fill from this spot using current palettes
        const seed = { x, y };
        if (removeColors.length === 0 && !targetColor) {
          // No palette yet — treat seed click as "remove this color from this spot"
          const next = [color];
          setRemoveColors(next);
          refreshColorPickPreview(next, keepColors, tolerance, seed);
        } else {
          refreshColorPickPreview(
            removeColors,
            keepColors,
            tolerance,
            seed,
            targetColor ?? undefined
          );
        }
        setClickRemoveMode(false);
        return;
      }

      if (pickTool === 'remove') {
        const next = [...removeColors, color];
        setRemoveColors(next);
        // Keep legacy targetColor synced to the most-recent remove color so
        // tolerance-only changes still preview when palette is single-element.
        setTargetColor(color);
        refreshColorPickPreview(next, keepColors, tolerance);
      } else {
        const next = [...keepColors, color];
        setKeepColors(next);
        refreshColorPickPreview(removeColors, next, tolerance);
      }
    },
    [
      panelMode,
      clickRemoveMode,
      targetColor,
      tolerance,
      hasResult,
      eventToCanvasCoords,
      pickTool,
      removeColors,
      keepColors,
      refreshColorPickPreview,
    ]
  );

  // ---------- Mode switch / brush controls ----------
  const handleModeSwitch = useCallback(
    (mode: PanelMode) => {
      setPanelMode(mode);
      setClickRemoveMode(false);
      if (hasResult) return;
      // Reset preview based on the mode we're entering
      if (mode === 'ai-brush') {
        const m = cumulativeMaskRef.current;
        if (m) renderPreviewFromMask(m);
        else resetCumulativeToInitial();
      } else if (originalDataRef.current && previewRef.current) {
        const pCtx = previewRef.current.getContext('2d');
        if (pCtx) {
          pCtx.clearRect(
            0,
            0,
            previewRef.current.width,
            previewRef.current.height
          );
          pCtx.putImageData(originalDataRef.current, 0, 0);
        }
      }
    },
    [hasResult, renderPreviewFromMask, resetCumulativeToInitial]
  );

  const handleUndoStroke = useCallback(() => {
    const history = strokeHistoryRef.current;
    if (history.length === 0) return;
    const popped = history[history.length - 1];
    const next = history.slice(0, -1);
    strokeHistoryRef.current = next;
    setStrokeHistory(next);
    // Restore pre-cleanup SAM mask, then re-derive cumulative at current tolerance.
    samMaskRef.current = new Uint8Array(popped.maskBefore);
    recomputeCumulative();
  }, [recomputeCumulative]);

  const handleClearStrokes = useCallback(() => {
    strokeHistoryRef.current = [];
    setStrokeHistory([]);
    resetCumulativeToInitial();
  }, [resetCumulativeToInitial]);

  // ---------- Server-removal for Color Pick / AI Only ----------
  const buildOptions = useCallback((): RemovalOptions => {
    if (panelMode === 'color-pick') {
      // Multi-color (Phase 1.14): prefer palettes; fall back to legacy single targetColor.
      if (removeColors.length > 0) {
        return {
          mode: 'color-fill',
          removeColors,
          keepColors: keepColors.length > 0 ? keepColors : undefined,
          tolerance,
        };
      }
      return {
        mode: 'color-fill',
        targetColor: targetColor ?? [255, 255, 255],
        tolerance,
      };
    }
    return { mode: 'ml-only', model };
  }, [panelMode, targetColor, removeColors, keepColors, tolerance, model]);

  const handleRemove = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setUpgradeRequired(false);
    const options = buildOptions();
    const resultImg = await runRemoval(canvas, options);
    if (!resultImg) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(resultImg, 0, 0, canvas.width, canvas.height);
    const preview = previewRef.current;
    if (preview) {
      preview.width = canvas.width;
      preview.height = canvas.height;
      const pCtx = preview.getContext('2d');
      if (pCtx) {
        pCtx.clearRect(0, 0, canvas.width, canvas.height);
        pCtx.drawImage(canvas, 0, 0);
      }
    }
    setHasResult(true);
  }, [buildOptions, runRemoval]);

  // ---------- AI Brush: Apply (write final masked RGBA to canvasRef) ----------
  const handleApplyBrush = useCallback(() => {
    const canvas = canvasRef.current;
    const preview = previewRef.current;
    const orig = originalDataRef.current;
    const mask = cumulativeMaskRef.current;
    if (!canvas || !preview || !orig || !mask) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = orig.width;
    const h = orig.height;
    const out = new ImageData(new Uint8ClampedArray(orig.data), w, h);
    const od = out.data;
    const src = orig.data;
    for (let i = 0; i < mask.length; i++) {
      od[i * 4 + 3] = mask[i] ? src[i * 4 + 3] : 0;
    }
    ctx.clearRect(0, 0, w, h);
    ctx.putImageData(out, 0, 0);
    const pCtx = preview.getContext('2d');
    if (pCtx) {
      pCtx.clearRect(0, 0, w, h);
      pCtx.putImageData(out, 0, 0);
    }
    setHasResult(true);

    // Phase 2.2 follow-up: Apply Mask now also propagates the
    // background-removed canvas to Studio's working image so chained
    // tools (Upscale, Color Change, Vectorize) receive the cleaned
    // version. Studio's global Save to Gallery commits when the user
    // is done across all tools.
    onSave(canvas, 'in-house').catch(err => {
      console.error('[BgRemoval] Apply propagation failed:', err);
    });
  }, [onSave]);

  // ---------- Reset / Save / Download ----------
  const handleReset = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
    originalDataRef.current = ctx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );
    const preview = previewRef.current;
    if (preview) {
      preview.width = canvas.width;
      preview.height = canvas.height;
      const pCtx = preview.getContext('2d');
      if (pCtx) pCtx.drawImage(image, 0, 0);
    }
    setHasResult(false);
    setUpgradeRequired(false);
    strokeHistoryRef.current = [];
    setStrokeHistory([]);
    samMaskRef.current = null;
    cumulativeMaskRef.current = null;
    initialMaskRef.current = null;
    setContoursD('');
    setRemoveColors([]);
    setKeepColors([]);
    setTargetColor(null);
    setClickRemoveMode(false);
    reset();
    // Re-run AI pipeline so the brush + initial mask come back.
    runInitialAnalysis(canvas);
  }, [image, reset, runInitialAnalysis]);

  const handleSave = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasResult) return;
    setIsSaving(true);
    try {
      await onSave(canvas, 'in-house');
    } finally {
      setIsSaving(false);
    }
  }, [hasResult, onSave]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasResult) return;
    const link = document.createElement('a');
    link.download = 'background-removed.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [hasResult]);

  const isProcessing = [
    'authorizing',
    'detecting',
    'removing',
    'embedding',
    'predicting',
  ].includes(status);
  const samReady = samSession !== null;
  const cursorClass = (() => {
    if (hasResult) return '';
    if (isSpaceHeld) return 'cursor-grab';
    if (panelMode === 'color-pick') {
      return clickRemoveMode ? 'cursor-crosshair' : 'cursor-cell';
    }
    if (panelMode === 'ai-brush' && samReady) return 'cursor-none';
    return '';
  })();

  // Compute overlay scale for cursor + dot positioning
  const overlayScale =
    canvasRect && previewRef.current && previewRef.current.width
      ? canvasRect.width / previewRef.current.width
      : 1;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {upgradeRequired && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-[1800px] mx-auto flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 flex-1">
              The in-house background remover is available on paid plans.{' '}
              <a
                href="/pricing"
                className="font-medium underline hover:text-amber-900"
              >
                Upgrade your plan
              </a>{' '}
              or use the{' '}
              <a
                href={advancedBgUrl || '/process/background-removal'}
                className="font-medium underline hover:text-amber-900"
              >
                Advanced remover
              </a>{' '}
              (1 credit).
            </p>
          </div>
        </div>
      )}

      {error && !upgradeRequired && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="max-w-[1800px] mx-auto flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800 flex-1">{error}</p>
            <button
              onClick={reset}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Preview canvas + overlays */}
        <div
          ref={containerRef}
          className={`flex-1 flex items-center justify-center min-h-[300px] overflow-hidden p-4 ${cursorClass}`}
          style={{
            backgroundColor: '#ffffff',
            backgroundImage:
              'repeating-conic-gradient(#e0e0e0 0% 25%, #ffffff 0% 50%)',
            backgroundSize: '20px 20px',
          }}
        >
          <div className="relative">
            {/* Zoom/pan transform wrapper — only the canvas + SVG overlays
                live inside this. Cursor circle + view pill + zoom controls
                stay OUTSIDE so they don't scale or pan. */}
            <div
              ref={canvasZoomWrapperRef}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
                touchAction: 'none',
                position: 'relative',
                lineHeight: 0,
              }}
            >
              <canvas
                ref={previewRef}
                suppressHydrationWarning
                className="max-w-full max-h-full shadow-lg rounded block"
                style={{
                  maxHeight: 'calc(100vh - 280px)',
                  background: 'transparent',
                }}
                onClick={handlePreviewClick}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerLeave={handlePointerLeave}
                onPointerCancel={handlePointerCancel}
              />
              {/* Stroke-line overlay (committed strokes + in-progress live path) */}
              {panelMode === 'ai-brush' && !hasResult && canvasRect && (
                <svg
                  className="absolute inset-0 pointer-events-none"
                  width={canvasRect.width}
                  height={canvasRect.height}
                >
                  {strokeHistory.map((s: StrokeRecord, i: number) => (
                    <path
                      key={i}
                      d={pathToSvgD(s.rawPath, overlayScale)}
                      stroke={s.tool === 'keep' ? '#10b981' : '#ef4444'}
                      strokeWidth={s.brushSize * overlayScale}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      opacity={0.65}
                    />
                  ))}
                  <path
                    ref={livePathRef}
                    d=""
                    stroke={brushTool === 'keep' ? '#10b981' : '#ef4444'}
                    strokeWidth={brushSize * overlayScale}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    opacity={0.65}
                  />
                </svg>
              )}
              {/* Marching-ants outline: hidden in 'preview' view */}
              {panelMode === 'ai-brush' &&
                !hasResult &&
                viewMode !== 'preview' &&
                canvasRect &&
                contoursD &&
                previewRef.current && (
                  <svg
                    className="absolute inset-0 pointer-events-none"
                    width={canvasRect.width}
                    height={canvasRect.height}
                    viewBox={`0 0 ${previewRef.current.width} ${previewRef.current.height}`}
                    preserveAspectRatio="none"
                  >
                    <path
                      d={contoursD}
                      fill="none"
                      stroke="black"
                      strokeWidth={1.5}
                      vectorEffect="non-scaling-stroke"
                    />
                    <path
                      d={contoursD}
                      fill="none"
                      stroke="white"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                )}
            </div>
            {/* Brush cursor overlay — outside transform; positioned in untransformed
                space and sized by zoom so it tracks the visible brush footprint. */}
            {panelMode === 'ai-brush' &&
              cursorPos &&
              samReady &&
              !hasResult &&
              lastPointerTypeRef.current === 'mouse' &&
              !isSpaceHeld && (
                <div
                  className="absolute pointer-events-none rounded-full border-2"
                  style={{
                    left:
                      pan.x +
                      cursorPos.x -
                      (brushSize * overlayScale * zoom) / 2,
                    top:
                      pan.y +
                      cursorPos.y -
                      (brushSize * overlayScale * zoom) / 2,
                    width: brushSize * overlayScale * zoom,
                    height: brushSize * overlayScale * zoom,
                    borderColor: brushTool === 'keep' ? '#10b981' : '#ef4444',
                    background:
                      brushTool === 'keep'
                        ? 'rgba(16,185,129,0.18)'
                        : 'rgba(239,68,68,0.18)',
                  }}
                />
              )}
            {/* View-mode pill (Cutout / Preview / Original) — top-left */}
            {panelMode === 'ai-brush' && !hasResult && (
              <div className="absolute top-2 left-2 z-10 flex rounded-full bg-white/90 backdrop-blur-sm shadow border border-gray-200 overflow-hidden text-xs font-medium">
                {(['cutout', 'preview', 'original'] as const).map(m => (
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
              </div>
            )}
            {/* Zoom-controls pill — top-right */}
            {panelMode === 'ai-brush' && !hasResult && (
              <div className="absolute top-2 right-2 z-10 flex items-center rounded-full bg-white/90 backdrop-blur-sm shadow border border-gray-200 overflow-hidden text-xs font-medium">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="px-2.5 py-1 text-gray-700 hover:bg-gray-50"
                  title="Zoom out"
                >
                  −
                </button>
                <span className="px-2 text-gray-500 tabular-nums select-none">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="px-2.5 py-1 text-gray-700 hover:bg-gray-50"
                  title="Zoom in"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={handleZoomFit}
                  className="px-2.5 py-1 text-gray-700 hover:bg-gray-50 border-l border-gray-200"
                  title="Reset zoom and pan"
                >
                  Fit
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="w-full lg:w-72 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col overflow-y-auto">
          <div className="p-4 flex flex-col gap-4 flex-1">
            {/* Mode switcher */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Mode
              </label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {(
                  [
                    {
                      mode: 'ai-brush' as PanelMode,
                      label: 'AI Brush',
                      Icon: Wand2,
                    },
                    {
                      mode: 'color-pick' as PanelMode,
                      label: 'Color',
                      Icon: Pipette,
                    },
                    {
                      mode: 'ai-only' as PanelMode,
                      label: 'AI Only',
                      Icon: Cpu,
                    },
                  ] as const
                ).map(({ mode, label, Icon }) => (
                  <button
                    key={mode}
                    onClick={() => handleModeSwitch(mode)}
                    disabled={isProcessing}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                      panelMode === mode
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Brush mode */}
            {panelMode === 'ai-brush' && !hasResult && (
              <>
                {/* Readiness banner */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs">
                  {!samReady ? (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Preparing AI Brush... (~5s)
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-gray-700">
                      <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-green-600 flex-shrink-0" />
                      <p>
                        AI Brush ready. We auto-detected the subject. Use{' '}
                        <span className="text-green-700 font-medium">Keep</span>{' '}
                        to add regions,{' '}
                        <span className="text-red-700 font-medium">Remove</span>{' '}
                        to erase.
                      </p>
                    </div>
                  )}
                </div>

                {/* Tool toggle */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Brush Tool
                  </label>
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => setBrushTool('keep')}
                      disabled={!samReady}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                        brushTool === 'keep'
                          ? 'bg-green-600 text-white'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Keep
                    </button>
                    <button
                      onClick={() => setBrushTool('remove')}
                      disabled={!samReady}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                        brushTool === 'remove'
                          ? 'bg-red-600 text-white'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Minus className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
                </div>

                {/* Brush size */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-600">
                      Brush Size
                    </label>
                    <span className="text-xs text-gray-500 tabular-nums">
                      {brushSize}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={80}
                    step={1}
                    value={brushSize}
                    onChange={e => setBrushSize(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Size of click points along brush strokes. Visual cursor only
                    — SAM figures out the actual region.
                  </p>
                </div>

                {/* Edge cleanup tolerance */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-600">
                      Edge Cleanup
                    </label>
                    <span className="text-xs text-gray-500 tabular-nums">
                      {cleanupTolerance}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={150}
                    step={1}
                    value={cleanupTolerance}
                    onChange={e => setCleanupTolerance(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Higher = removes more anti-aliased fringe and specks. Too
                    high may erase darker valid content.
                  </p>
                </div>

                {/* Undo / Clear */}
                <div className="flex gap-2">
                  <button
                    onClick={handleUndoStroke}
                    disabled={strokeHistory.length === 0 || isProcessing}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    Undo
                  </button>
                  <button
                    onClick={handleClearStrokes}
                    disabled={strokeHistory.length === 0 || isProcessing}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear
                  </button>
                </div>

                <div className="text-xs text-gray-400">
                  {strokeHistory.length === 0
                    ? 'No strokes yet — showing initial AI guess.'
                    : `${strokeHistory.length} stroke${strokeHistory.length === 1 ? '' : 's'} placed.`}
                </div>

                {/* Apply button */}
                <button
                  onClick={handleApplyBrush}
                  disabled={isProcessing || !samReady}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {STATUS_LABELS[status] || 'Processing...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Apply Mask
                    </>
                  )}
                </button>
              </>
            )}

            {/* Color Pick mode */}
            {panelMode === 'color-pick' && !hasResult && (
              <>
                {/* Pick-tool toggle: which palette does the next click add to? */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Click Image To...
                  </label>
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => setPickTool('remove')}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
                        pickTool === 'remove'
                          ? 'bg-red-600 text-white'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Minus className="w-3.5 h-3.5" />
                      Pick to Remove
                    </button>
                    <button
                      onClick={() => setPickTool('keep')}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
                        pickTool === 'keep'
                          ? 'bg-green-600 text-white'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Pick to Keep
                    </button>
                  </div>
                </div>

                {/* Remove palette chips */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Removing ({removeColors.length})
                  </label>
                  <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
                    {removeColors.length === 0 && (
                      <p className="text-xs text-gray-400 italic">
                        Click image with &quot;Pick to Remove&quot; to add a
                        color.
                      </p>
                    )}
                    {removeColors.map((c, i) => (
                      <button
                        key={`r-${i}`}
                        type="button"
                        onClick={() => {
                          const next = removeColors.filter((_, j) => j !== i);
                          setRemoveColors(next);
                          refreshColorPickPreview(
                            next,
                            keepColors,
                            tolerance,
                            null,
                            targetColor ?? undefined
                          );
                        }}
                        className="relative w-8 h-8 rounded border border-gray-300 shadow-sm group"
                        style={{ background: rgbToHex(c) }}
                        title={`${rgbToHex(c).toUpperCase()} — click to remove from palette`}
                      >
                        <span className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/40 rounded text-white text-xs">
                          ×
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Keep palette chips */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Keeping ({keepColors.length})
                  </label>
                  <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
                    {keepColors.length === 0 && (
                      <p className="text-xs text-gray-400 italic">
                        Click image with &quot;Pick to Keep&quot; to protect a
                        color.
                      </p>
                    )}
                    {keepColors.map((c, i) => (
                      <button
                        key={`k-${i}`}
                        type="button"
                        onClick={() => {
                          const next = keepColors.filter((_, j) => j !== i);
                          setKeepColors(next);
                          refreshColorPickPreview(
                            removeColors,
                            next,
                            tolerance,
                            null,
                            targetColor ?? undefined
                          );
                        }}
                        className="relative w-8 h-8 rounded border border-gray-300 shadow-sm group"
                        style={{ background: rgbToHex(c) }}
                        title={`${rgbToHex(c).toUpperCase()} — click to remove from palette`}
                      >
                        <span className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/40 rounded text-white text-xs">
                          ×
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Click-to-seed button */}
                <button
                  onClick={() => setClickRemoveMode(v => !v)}
                  disabled={removeColors.length === 0 && !targetColor}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 ${
                    clickRemoveMode
                      ? 'bg-orange-50 border-orange-300 text-orange-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {clickRemoveMode
                    ? 'Click a spot to clean it…'
                    : 'Click to clean a spot (interior speckle)'}
                </button>

                {/* Reset palettes */}
                {(removeColors.length > 0 || keepColors.length > 0) && (
                  <button
                    onClick={() => {
                      setRemoveColors([]);
                      setKeepColors([]);
                      setTargetColor(null);
                      // Repaint with the original
                      const orig = originalDataRef.current;
                      const preview = previewRef.current;
                      if (orig && preview) {
                        const pCtx = preview.getContext('2d');
                        if (pCtx) {
                          pCtx.clearRect(0, 0, preview.width, preview.height);
                          pCtx.putImageData(orig, 0, 0);
                        }
                      }
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 underline self-start"
                  >
                    Reset palettes
                  </button>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-600">
                      Tolerance
                    </label>
                    <span className="text-xs text-gray-500 tabular-nums">
                      {tolerance}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={150}
                    step={5}
                    value={tolerance}
                    onChange={e =>
                      handleToleranceChange(Number(e.target.value))
                    }
                    disabled={isProcessing}
                    className="w-full accent-blue-600 disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Higher = removes more (use for soft or gradient edges).
                  </p>
                </div>

                <button
                  onClick={handleRemove}
                  disabled={
                    isProcessing || (removeColors.length === 0 && !targetColor)
                  }
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {STATUS_LABELS[status] || 'Processing...'}
                    </>
                  ) : (
                    <>
                      <Scissors className="w-4 h-4" />
                      Remove Background
                    </>
                  )}
                </button>
              </>
            )}

            {/* AI Only mode */}
            {panelMode === 'ai-only' && !hasResult && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    AI Model
                  </label>
                  <select
                    value={model}
                    onChange={e => setModel(e.target.value as BgRemovalModel)}
                    disabled={isProcessing}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {MODELS.map(m => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleRemove}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {STATUS_LABELS[status] || 'Processing...'}
                    </>
                  ) : (
                    <>
                      <Scissors className="w-4 h-4" />
                      Remove Background
                    </>
                  )}
                </button>
              </>
            )}

            {hasResult && (
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset to original
              </button>
            )}

            {hasResult && (
              <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isSaving ? 'Saving...' : 'Save to Gallery'}
                </button>
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PNG
                </button>
              </div>
            )}

            <div className="mt-auto pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">
                Need cleaner edges for hair, fur, or fine detail?
              </p>
              <a
                href={advancedBgUrl || '/process/background-removal'}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Advanced BG Removal (1 credit)
              </a>
              <p className="text-xs text-gray-400 mt-1.5">
                Uses ClippingMagic AI — best quality for complex subjects.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors"
          >
            Back
          </button>
          {savedImageId && (
            <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Saved!{' '}
              <a
                href="/dashboard#my-images"
                className="underline opacity-80 hover:opacity-100"
              >
                View gallery
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
