'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Download,
  ExternalLink,
  Loader2,
  Save,
  Scissors,
  RotateCcw,
  Pipette,
  Cpu,
  Wand2,
  Crosshair,
} from 'lucide-react';

import { clientFloodFill, useBackgroundRemoval } from '@/hooks/useBackgroundRemoval';
import type {
  BgRemovalModel,
  PanelMode,
  RGB,
  RemovalOptions,
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
  embedding: 'Preparing image...',
  predicting: 'Running prediction...',
  done: 'Done!',
  error: '',
};

const MODELS: { value: BgRemovalModel; label: string }[] = [
  { value: 'birefnet-general-lite', label: 'Standard (BiRefNet)' },
  { value: 'birefnet-dis', label: 'High Detail (Graphics + Text)' },
  { value: 'birefnet-general', label: 'Maximum Quality (slow)' },
  { value: 'u2net', label: 'Fast (U2Net)' },
  { value: 'u2net_human_seg', label: 'People & Portraits' },
  { value: 'isnet-anime', label: 'Anime / Illustrations' },
];

const CONFIDENCE_LABELS: Record<string, string> = {
  uniform: 'Solid color background',
  'two-color': 'Two-color background',
  gradient: 'Gradient background',
  complex: 'Complex / photo background',
  transparent: 'Already transparent',
};

const REC_MODE_LABELS: Record<string, string> = {
  'color-fill': 'Color Fill (fast)',
  'two-color-fill': 'Color Fill (fast)',
  'ml+color': 'AI + Color Fill',
  'ml-only': 'AI Only',
  noop: 'No removal needed',
};

function rgbToHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function isDark([r, g, b]: RGB): boolean {
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

export function BackgroundRemovalPanel({
  image,
  onSave,
  onCancel,
  savedImageId,
  advancedBgUrl,
}: BackgroundRemovalPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const originalDataRef = useRef<ImageData | null>(null);
  const toleranceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [panelMode, setPanelMode] = useState<PanelMode>('auto');
  const [model, setModel] = useState<BgRemovalModel>('birefnet-general-lite');
  const [tolerance, setTolerance] = useState(30);
  const [targetColor, setTargetColor] = useState<RGB | null>(null);
  const [clickRemoveMode, setClickRemoveMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  const { status, error, detection, runDetect, runRemoval, reset } = useBackgroundRemoval();

  // Init offscreen canvas and auto-detect on mount
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

    runDetect(canvas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image]);

  // When detection arrives, set targetColor from dominant if not yet set
  useEffect(() => {
    if (detection?.dominant && !targetColor) {
      setTargetColor(detection.dominant);
    }
  }, [detection, targetColor]);

  // Detect upgrade-required errors
  useEffect(() => {
    if (error && (error.includes('403') || error.toLowerCase().includes('upgrade'))) {
      setUpgradeRequired(true);
    }
  }, [error]);

  // Apply client-side flood fill to the preview canvas (does NOT modify canvasRef)
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

  // Debounced tolerance slider
  const handleToleranceChange = useCallback(
    (val: number) => {
      setTolerance(val);
      if (panelMode === 'ai-only' || hasResult) return;
      const color = targetColor;
      if (!color) return;
      if (toleranceTimerRef.current) clearTimeout(toleranceTimerRef.current);
      toleranceTimerRef.current = setTimeout(() => {
        applyClientPreview(color, val);
      }, 200);
    },
    [panelMode, hasResult, targetColor, applyClientPreview]
  );

  // Canvas click: eyedropper or seed-fill
  const handlePreviewClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const preview = previewRef.current;
      const orig = originalDataRef.current;
      if (!preview || !orig || hasResult || panelMode !== 'color-pick') return;

      const rect = preview.getBoundingClientRect();
      const scaleX = preview.width / rect.width;
      const scaleY = preview.height / rect.height;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);

      if (clickRemoveMode) {
        if (!targetColor) return;
        applyClientPreview(targetColor, tolerance, { x, y });
        setClickRemoveMode(false);
      } else {
        // Eyedropper: sample from original data
        const idx = (y * orig.width + x) * 4;
        const color: RGB = [orig.data[idx], orig.data[idx + 1], orig.data[idx + 2]];
        setTargetColor(color);
        applyClientPreview(color, tolerance);
      }
    },
    [panelMode, clickRemoveMode, targetColor, tolerance, hasResult, applyClientPreview]
  );

  // When target color changes in color-pick mode, update preview
  const handleTargetColorChange = useCallback(
    (color: RGB) => {
      setTargetColor(color);
      if (panelMode === 'color-pick' && !hasResult) {
        applyClientPreview(color, tolerance);
      }
    },
    [panelMode, hasResult, tolerance, applyClientPreview]
  );

  // Switch modes: reset preview to original when switching away from result
  const handleModeSwitch = useCallback(
    (mode: PanelMode) => {
      setPanelMode(mode);
      setClickRemoveMode(false);
      // If we have a prior client preview (no server result), reset to original
      if (!hasResult && originalDataRef.current && previewRef.current) {
        const preview = previewRef.current;
        const pCtx = preview.getContext('2d');
        if (pCtx) {
          pCtx.clearRect(0, 0, preview.width, preview.height);
          pCtx.putImageData(originalDataRef.current, 0, 0);
        }
      }
    },
    [hasResult]
  );

  // Build server RemovalOptions based on current mode + settings
  const buildOptions = useCallback((): RemovalOptions => {
    if (panelMode === 'color-pick') {
      return {
        mode: 'color-fill',
        targetColor: targetColor ?? [255, 255, 255],
        tolerance,
      };
    }
    if (panelMode === 'ai-only') {
      return { mode: 'ml-only', model };
    }
    // Auto: use detection recommendation
    const rec = detection?.recommended_mode;
    if (!rec || rec === 'noop') {
      return { mode: 'ml-only', model };
    }
    if (rec === 'color-fill' || rec === 'two-color-fill') {
      return {
        mode: 'color-fill',
        targetColor: detection!.dominant,
        tolerance,
      };
    }
    if (rec === 'ml+color') {
      return {
        mode: 'ml+color',
        model,
        targetColor: detection!.dominant,
        tolerance,
      };
    }
    return { mode: 'ml-only', model };
  }, [panelMode, targetColor, tolerance, model, detection]);

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

  const handleReset = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);

    // Restore originalDataRef
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
    reset();
  }, [image, reset]);

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
  const showColorControls = panelMode === 'auto' || panelMode === 'color-pick';
  const showModelSelector = panelMode === 'ai-only' || (panelMode === 'auto' && detection?.recommended_mode && ['ml-only', 'ml+color'].includes(detection.recommended_mode));

  const cursorStyle =
    !hasResult && panelMode === 'color-pick'
      ? clickRemoveMode
        ? 'cursor-crosshair'
        : 'cursor-cell'
      : '';

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Upgrade required banner */}
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

      {/* Non-upgrade errors */}
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
        {/* Preview canvas */}
        <div
          className={`flex-1 flex items-center justify-center min-h-[300px] overflow-hidden p-4 ${cursorStyle}`}
          style={{
            backgroundColor: '#ffffff',
            backgroundImage: 'repeating-conic-gradient(#e0e0e0 0% 25%, #ffffff 0% 50%)',
            backgroundSize: '20px 20px',
          }}
        >
          <canvas
            ref={previewRef}
            className="max-w-full max-h-full shadow-lg rounded"
            style={{ maxHeight: 'calc(100vh - 280px)', background: 'transparent' }}
            onClick={handlePreviewClick}
          />
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
                    { mode: 'auto' as PanelMode, label: 'Auto', Icon: Wand2 },
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

            {/* Auto mode: detection banner */}
            {panelMode === 'auto' && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs">
                {status === 'detecting' ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Analyzing background...
                  </div>
                ) : detection ? (
                  <>
                    <div className="flex items-center gap-2 mb-1.5">
                      {detection.dominant && (
                        <span
                          className="w-4 h-4 rounded-sm border border-gray-300 flex-shrink-0"
                          style={{ background: rgbToHex(detection.dominant) }}
                        />
                      )}
                      <span className="font-medium text-gray-700">
                        {CONFIDENCE_LABELS[detection.confidence] ?? detection.confidence}
                      </span>
                    </div>
                    <p className="text-gray-500">
                      Will use:{' '}
                      <span className="font-medium text-gray-700">
                        {REC_MODE_LABELS[detection.recommended_mode] ?? detection.recommended_mode}
                      </span>
                    </p>
                    <button
                      onClick={() => handleModeSwitch('color-pick')}
                      className="mt-1.5 text-blue-600 hover:text-blue-800 underline"
                    >
                      Override with Color Pick
                    </button>
                  </>
                ) : (
                  <p className="text-gray-500">No detection yet — will use AI.</p>
                )}
              </div>
            )}

            {/* Color Pick mode: eyedropper + color swatch */}
            {panelMode === 'color-pick' && (
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

                {/* Click-to-remove toggle */}
                <button
                  onClick={() => setClickRemoveMode(v => !v)}
                  disabled={!targetColor || hasResult}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 ${
                    clickRemoveMode
                      ? 'bg-orange-50 border-orange-300 text-orange-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  {clickRemoveMode ? 'Click a spot to remove it…' : 'Click to remove a spot'}
                </button>
                {clickRemoveMode && (
                  <p className="text-xs text-gray-400">
                    Removes the connected color region from your click point only.
                  </p>
                )}
              </div>
            )}

            {/* Tolerance slider (color-based modes) */}
            {showColorControls && !hasResult && (
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
            )}

            {/* Model selector */}
            {showModelSelector && (
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
            )}

            {/* Remove button */}
            <button
              onClick={handleRemove}
              disabled={isProcessing || hasResult}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
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

            {hasResult && (
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset to original
              </button>
            )}

            {/* Save / Download */}
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

            {/* Advanced BG removal link */}
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

      {/* Footer */}
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
