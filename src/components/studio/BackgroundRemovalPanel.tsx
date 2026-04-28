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
  samplePathPoints,
  useBackgroundRemoval,
} from '@/hooks/useBackgroundRemoval';
import type {
  BgRemovalModel,
  PanelMode,
  RGB,
  RemovalOptions,
  SamPoint,
} from '@/types/backgroundRemoval';

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

function pathToSvgD(path: Array<{ x: number; y: number }>, scale: number): string {
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

function collectStrokeColors(
  history: Array<{ tool: 'keep' | 'remove'; points: { x: number; y: number; label: 0 | 1 }[] }>,
  tool: 'keep' | 'remove',
  orig: ImageData
): Array<[number, number, number]> {
  const colors: Array<[number, number, number]> = [];
  const w = orig.width;
  const h = orig.height;
  for (const s of history) {
    if (s.tool !== tool) continue;
    for (const p of s.points) {
      const x = Math.max(0, Math.min(w - 1, Math.round(p.x)));
      const y = Math.max(0, Math.min(h - 1, Math.round(p.y)));
      const j = (y * w + x) * 4;
      colors.push([orig.data[j], orig.data[j + 1], orig.data[j + 2]]);
    }
  }
  return colors;
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
  const [viewMode, setViewMode] = useState<'cutout' | 'original'>('cutout');
  const viewModeRef = useRef<'cutout' | 'original'>('cutout');
  const [contoursD, setContoursD] = useState<string>('');
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<Array<{ x: number; y: number }>>([]);
  const livePathRef = useRef<SVGPathElement | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [canvasRect, setCanvasRect] = useState<{ width: number; height: number } | null>(null);

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

  // Track preview's display rect for cursor / dot overlay positioning
  useEffect(() => {
    const update = () => {
      const p = previewRef.current;
      if (!p) return;
      const r = p.getBoundingClientRect();
      setCanvasRect({ width: r.width, height: r.height });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Detect upgrade-required errors
  useEffect(() => {
    if (error && (error.includes('403') || error.toLowerCase().includes('upgrade'))) {
      setUpgradeRequired(true);
    }
  }, [error]);

  // ---------- Color Pick: client-side flood-fill preview ----------
  const applyClientPreview = useCallback(
    (color: RGB, tol: number, seedPoint?: { x: number; y: number } | null) => {
      const orig = originalDataRef.current;
      const preview = previewRef.current;
      if (!orig || !preview || hasResult) return;
      const cloned = new ImageData(
        new Uint8ClampedArray(orig.data),
        orig.width,
        orig.height
      );
      clientFloodFill(cloned, color, tol, seedPoint ?? null);
      const pCtx = preview.getContext('2d');
      if (!pCtx) return;
      pCtx.clearRect(0, 0, preview.width, preview.height);
      pCtx.putImageData(cloned, 0, 0);
    },
    [hasResult]
  );

  const handleToleranceChange = useCallback(
    (val: number) => {
      setTolerance(val);
      if (panelMode !== 'color-pick' || hasResult || !targetColor) return;
      if (toleranceTimerRef.current) clearTimeout(toleranceTimerRef.current);
      toleranceTimerRef.current = setTimeout(() => {
        applyClientPreview(targetColor, val);
      }, 200);
    },
    [panelMode, hasResult, targetColor, applyClientPreview]
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
      return { x, y, displayX: e.clientX - rect.left, displayY: e.clientY - rect.top };
    },
    []
  );

  // ---------- AI Brush: cumulative mask + dual-layer rendering ----------

  /**
   * Render preview based on viewMode (read from ref so this callback stays stable):
   * - 'cutout': original at full alpha for kept pixels, faded to ~30% for removed
   * - 'original': original at full alpha, mask not applied (marching ants overlay still shows)
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
    if (viewModeRef.current === 'original') {
      pCtx.putImageData(orig, 0, 0);
      return;
    }
    if (mask.length !== w * h) return;
    const out = new ImageData(new Uint8ClampedArray(orig.data), w, h);
    const od = out.data;
    const src = orig.data;
    for (let i = 0; i < mask.length; i++) {
      const a = src[i * 4 + 3];
      od[i * 4 + 3] = mask[i] ? a : Math.min(a, 76);
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
    const keepColors = collectStrokeColors(strokeHistoryRef.current, 'keep', orig);
    const removeColors = collectStrokeColors(strokeHistoryRef.current, 'remove', orig);
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
    async (tool: BrushTool, path: Array<{ x: number; y: number }>, sizeAtCommit: number) => {
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
        for (let i = 0; i < total; i++) nextSam[i] = nextSam[i] & (samMask[i] ^ 1);
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

  // ---------- Canvas mouse handlers ----------
  // Compute scale from canvas-pixel space → SVG display space
  const overlayScaleNow = useCallback(() => {
    const p = previewRef.current;
    if (!p || !canvasRect || !p.width) return 1;
    return canvasRect.width / p.width;
  }, [canvasRect]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (hasResult) return;
      if (panelMode === 'color-pick') return; // handled by onClick
      if (panelMode !== 'ai-brush') return;
      if (!samSession) return;
      const c = eventToCanvasCoords(e);
      if (!c) return;
      isDrawingRef.current = true;
      currentStrokeRef.current = [{ x: c.x, y: c.y }];
      // Begin live SVG path
      const live = livePathRef.current;
      if (live) {
        const scale = overlayScaleNow();
        live.setAttribute('d', pathToSvgD(currentStrokeRef.current, scale));
        live.setAttribute('stroke', brushTool === 'keep' ? '#10b981' : '#ef4444');
        live.setAttribute('stroke-width', String(brushSize * scale));
      }
    },
    [panelMode, hasResult, samSession, eventToCanvasCoords, brushTool, brushSize, overlayScaleNow]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const c = eventToCanvasCoords(e);
      if (!c) return;
      if (panelMode === 'ai-brush') setCursorPos({ x: c.displayX, y: c.displayY });
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

  const endStroke = useCallback(() => {
    if (!isDrawingRef.current) return;
    const path = currentStrokeRef.current;
    const sizeAtCommit = brushSize;
    const toolAtCommit = brushTool;
    isDrawingRef.current = false;
    currentStrokeRef.current = [];
    // Clear live preview path (committed stroke takes over via React render)
    const live = livePathRef.current;
    if (live) live.setAttribute('d', '');
    commitStroke(toolAtCommit, path, sizeAtCommit);
  }, [commitStroke, brushTool, brushSize]);

  const handleMouseUp = useCallback(() => endStroke(), [endStroke]);
  const handleMouseLeave = useCallback(() => {
    setCursorPos(null);
    endStroke();
  }, [endStroke]);

  // Color-pick click (eyedropper or seed-fill)
  const handlePreviewClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (panelMode !== 'color-pick' || hasResult) return;
      const orig = originalDataRef.current;
      const c = eventToCanvasCoords(e);
      if (!orig || !c) return;
      const x = Math.floor(c.x);
      const y = Math.floor(c.y);
      if (clickRemoveMode) {
        if (!targetColor) return;
        applyClientPreview(targetColor, tolerance, { x, y });
        setClickRemoveMode(false);
      } else {
        const idx = (y * orig.width + x) * 4;
        const color: RGB = [orig.data[idx], orig.data[idx + 1], orig.data[idx + 2]];
        setTargetColor(color);
        applyClientPreview(color, tolerance);
      }
    },
    [panelMode, clickRemoveMode, targetColor, tolerance, hasResult, eventToCanvasCoords, applyClientPreview]
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
          pCtx.clearRect(0, 0, previewRef.current.width, previewRef.current.height);
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
      return {
        mode: 'color-fill',
        targetColor: targetColor ?? [255, 255, 255],
        tolerance,
      };
    }
    return { mode: 'ml-only', model };
  }, [panelMode, targetColor, tolerance, model]);

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
  }, []);

  // ---------- Reset / Save / Download ----------
  const handleReset = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
    originalDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
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

  const isProcessing = ['authorizing', 'detecting', 'removing', 'embedding', 'predicting'].includes(status);
  const samReady = samSession !== null;
  const cursorClass =
    !hasResult && panelMode === 'color-pick'
      ? clickRemoveMode
        ? 'cursor-crosshair'
        : 'cursor-cell'
      : !hasResult && panelMode === 'ai-brush' && samReady
        ? 'cursor-none'
        : '';

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
              <a href="/pricing" className="font-medium underline hover:text-amber-900">
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
            <button onClick={reset} className="text-xs text-red-600 hover:text-red-800">
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
            backgroundImage: 'repeating-conic-gradient(#e0e0e0 0% 25%, #ffffff 0% 50%)',
            backgroundSize: '20px 20px',
          }}
        >
          <div className="relative">
            <canvas
              ref={previewRef}
              suppressHydrationWarning
              className="max-w-full max-h-full shadow-lg rounded block"
              style={{ maxHeight: 'calc(100vh - 280px)', background: 'transparent' }}
              onClick={handlePreviewClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            />
            {/* Brush cursor overlay */}
            {panelMode === 'ai-brush' && cursorPos && samReady && !hasResult && (
              <div
                className="absolute pointer-events-none rounded-full border-2"
                style={{
                  left: cursorPos.x - (brushSize * overlayScale) / 2,
                  top: cursorPos.y - (brushSize * overlayScale) / 2,
                  width: brushSize * overlayScale,
                  height: brushSize * overlayScale,
                  borderColor: brushTool === 'keep' ? '#10b981' : '#ef4444',
                  background:
                    brushTool === 'keep'
                      ? 'rgba(16,185,129,0.18)'
                      : 'rgba(239,68,68,0.18)',
                }}
              />
            )}
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
            {/* Marching-ants outline: traces the cumulative mask boundary.
                Uses viewBox so coords are mask-pixel space (resize-stable). */}
            {panelMode === 'ai-brush' &&
              !hasResult &&
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
                    className="marching-ants"
                  />
                </svg>
              )}
            {/* View-mode pill (Cutout / Original) — top-left of canvas */}
            {panelMode === 'ai-brush' && !hasResult && (
              <div className="absolute top-2 left-2 z-10 flex rounded-full bg-white/90 backdrop-blur-sm shadow border border-gray-200 overflow-hidden text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setViewMode('cutout')}
                  className={`px-3 py-1 transition-colors ${
                    viewMode === 'cutout'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cutout
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('original')}
                  className={`px-3 py-1 transition-colors ${
                    viewMode === 'original'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Original
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
                    { mode: 'ai-brush' as PanelMode, label: 'AI Brush', Icon: Wand2 },
                    { mode: 'color-pick' as PanelMode, label: 'Color', Icon: Pipette },
                    { mode: 'ai-only' as PanelMode, label: 'AI Only', Icon: Cpu },
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
                        <span className="text-green-700 font-medium">Keep</span> to add
                        regions, <span className="text-red-700 font-medium">Remove</span>{' '}
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
                    <label className="text-xs font-medium text-gray-600">Brush Size</label>
                    <span className="text-xs text-gray-500 tabular-nums">{brushSize}px</span>
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
                    Size of click points along brush strokes. Visual cursor only — SAM
                    figures out the actual region.
                  </p>
                </div>

                {/* Edge cleanup tolerance */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-600">Edge Cleanup</label>
                    <span className="text-xs text-gray-500 tabular-nums">{cleanupTolerance}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={cleanupTolerance}
                    onChange={e => setCleanupTolerance(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Higher = removes more anti-aliased fringe and specks. Too high may erase
                    darker valid content.
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
                <div className="flex flex-col gap-2">
                  <label className="block text-xs font-medium text-gray-600">
                    Target Color
                  </label>
                  <div className="flex items-center gap-2">
                    {targetColor ? (
                      <span
                        className="w-8 h-8 rounded border border-gray-300 flex-shrink-0 shadow-sm"
                        style={{ background: rgbToHex(targetColor) }}
                        title={rgbToHex(targetColor)}
                      />
                    ) : (
                      <span className="w-8 h-8 rounded border border-dashed border-gray-300 flex-shrink-0" />
                    )}
                    <p className="text-xs text-gray-500">
                      {targetColor
                        ? `${rgbToHex(targetColor).toUpperCase()} — click image to repick`
                        : 'Click image to pick background color'}
                    </p>
                  </div>
                  <button
                    onClick={() => setClickRemoveMode(v => !v)}
                    disabled={!targetColor}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 ${
                      clickRemoveMode
                        ? 'bg-orange-50 border-orange-300 text-orange-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {clickRemoveMode ? 'Click a spot to remove it…' : 'Click to remove a spot'}
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-600">Tolerance</label>
                    <span className="text-xs text-gray-500 tabular-nums">{tolerance}</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={150}
                    step={5}
                    value={tolerance}
                    onChange={e => handleToleranceChange(Number(e.target.value))}
                    disabled={isProcessing}
                    className="w-full accent-blue-600 disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Higher = removes more (use for soft or gradient edges).
                  </p>
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
              <a href="/dashboard#my-images" className="underline opacity-80 hover:opacity-100">
                View gallery
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
