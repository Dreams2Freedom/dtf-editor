'use client';

/**
 * Upscale tool — Studio plugin Panel (Phase 2.2).
 *
 * Layout matches the BG Removal pattern: shared StudioCanvasFrame on
 * the left, vertical right-hand sidebar with controls. The working
 * image renders in the canvas. While the API is in flight we overlay
 * a processing animation. Once done, the user can compare via an
 * Original / Upscaled view-mode pill in the canvas top-left, then
 * Studio's global Save to Gallery commits.
 *
 * Two scale modes:
 *   - Simple: 2× / 4× toggle (existing)
 *   - Smart DPI: enter target print width × height in inches; system
 *     calculates the upscale needed to hit 300 DPI at that size.
 *
 * Provider abstraction unchanged — the Panel calls a single
 * UpscaleProvider whose implementation hits whichever upstream API.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

import {
  StudioCanvasFrame,
  CanvasProcessingOverlay,
} from '@/components/studio/StudioCanvasFrame';
import type { StudioToolPanelProps } from '../types';

import { deepImageProvider } from './providers/deepImage';
import type {
  UpscaleOptions,
  UpscaleProcessingMode,
  UpscaleProvider,
} from './providers/types';

const PROCESSING_MODES: {
  value: UpscaleProcessingMode;
  label: string;
  help: string;
}[] = [
  {
    value: 'auto_enhance',
    label: 'Auto Enhance',
    help: 'Denoise, deblur, and brighten — best general default.',
  },
  {
    value: 'generative_upscale',
    label: 'Generative Upscale',
    help: 'AI fills in detail. Best for low-resolution graphics.',
  },
  {
    value: 'basic_upscale',
    label: 'Basic Upscale',
    help: 'Simple resolution increase, no enhancements.',
  },
];

const DTF_PRESET_WIDTHS = [
  { label: '4"', width: 4 },
  { label: '8"', width: 8 },
  { label: '10"', width: 10 },
  { label: '11"', width: 11 },
  { label: '12"', width: 12 },
];

const TARGET_DPI = 300;
// Match upstream limits to avoid timeouts; mirrors the standalone
// /process/upscale page's caps.
const MAX_PIXEL_DIMENSION = 6000;
const MAX_MEGAPIXELS = 30;

const DEFAULT_PROVIDER: UpscaleProvider = deepImageProvider;

type ScaleMode = 'simple' | 'smart-dpi';
type ViewMode = 'original' | 'upscaled';

function imageToBlob(image: HTMLImageElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Failed to get 2D context'));
      return;
    }
    ctx.drawImage(image, 0, 0);
    canvas.toBlob(b => {
      if (b) resolve(b);
      else reject(new Error('Failed to convert image to blob'));
    }, 'image/png');
  });
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load upscaled image'));
    img.src = url;
  });
}

function imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.drawImage(img, 0, 0);
  return canvas;
}

/**
 * Smart-DPI math: given the original image size and desired print
 * dimensions in inches, compute the upscale factor needed to hit
 * targetDPI at that size, capped to the upstream limits.
 */
function calculateSmartDpi(
  imageWidth: number,
  imageHeight: number,
  printW: number,
  printH: number
): { targetWidth: number; targetHeight: number; effectiveScale: number } {
  let requiredWidth = Math.round(printW * TARGET_DPI);
  let requiredHeight = Math.round(printH * TARGET_DPI);

  if (
    requiredWidth > MAX_PIXEL_DIMENSION ||
    requiredHeight > MAX_PIXEL_DIMENSION
  ) {
    const limitScale = Math.min(
      MAX_PIXEL_DIMENSION / requiredWidth,
      MAX_PIXEL_DIMENSION / requiredHeight
    );
    requiredWidth = Math.round(requiredWidth * limitScale);
    requiredHeight = Math.round(requiredHeight * limitScale);
  }

  const megapixels = (requiredWidth * requiredHeight) / 1_000_000;
  if (megapixels > MAX_MEGAPIXELS) {
    const mpScale = Math.sqrt(MAX_MEGAPIXELS / megapixels);
    requiredWidth = Math.round(requiredWidth * mpScale);
    requiredHeight = Math.round(requiredHeight * mpScale);
  }

  const effectiveScale = Math.max(
    requiredWidth / imageWidth,
    requiredHeight / imageHeight
  );

  return {
    targetWidth: requiredWidth,
    targetHeight: requiredHeight,
    effectiveScale,
  };
}

export function UpscalePanel({ image, onApply }: StudioToolPanelProps) {
  const [scaleMode, setScaleMode] = useState<ScaleMode>('simple');
  const [scale, setScale] = useState<2 | 4>(4);
  const [mode, setMode] = useState<UpscaleProcessingMode>('auto_enhance');
  const [printWidth, setPrintWidth] = useState<string>('');
  const [printHeight, setPrintHeight] = useState<string>('');
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upscaledImage, setUpscaledImage] = useState<HTMLImageElement | null>(
    null
  );
  const [viewMode, setViewMode] = useState<ViewMode>('original');

  // Canvas zoom — local to the tool, controls forwarded to frame.
  const [zoom, setZoom] = useState(1);
  const aspectRatioRef = useRef(image.width / image.height);

  const provider = DEFAULT_PROVIDER;

  // Reset upscaled state if the working image changes (chained from
  // another tool, or user reset to original).
  useEffect(() => {
    setUpscaledImage(null);
    setViewMode('original');
    setError(null);
    aspectRatioRef.current = image.width / image.height;
  }, [image]);

  const handleWidthChange = (val: string) => {
    setPrintWidth(val);
    const w = parseFloat(val);
    if (!isNaN(w) && w > 0) {
      setPrintHeight((w / aspectRatioRef.current).toFixed(2));
    }
  };

  const handleHeightChange = (val: string) => {
    setPrintHeight(val);
    const h = parseFloat(val);
    if (!isNaN(h) && h > 0) {
      setPrintWidth((h * aspectRatioRef.current).toFixed(2));
    }
  };

  const handleUpscale = useCallback(async () => {
    setError(null);
    setIsUpscaling(true);
    try {
      const blob = await imageToBlob(image);
      const opts: UpscaleOptions = { scale, processingMode: mode };

      if (scaleMode === 'smart-dpi') {
        const w = parseFloat(printWidth);
        const h = parseFloat(printHeight);
        if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
          throw new Error('Enter both print width and height in inches.');
        }
        const calc = calculateSmartDpi(
          image.naturalWidth || image.width,
          image.naturalHeight || image.height,
          w,
          h
        );
        opts.targetWidth = calc.targetWidth;
        opts.targetHeight = calc.targetHeight;
        opts.scale = calc.effectiveScale > 2 ? 4 : 2;
      }

      const result = await provider.run(blob, opts);
      const upscaled = await loadImageFromUrl(result.url);
      setUpscaledImage(upscaled);
      setViewMode('upscaled');
      const canvas = imageToCanvas(upscaled);
      onApply(canvas, {
        operation:
          scaleMode === 'smart-dpi' ? 'upscale_smart_dpi' : `upscale_${scale}x`,
        provider: provider.id,
        modelId: mode,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upscale failed';
      setError(msg);
    } finally {
      setIsUpscaling(false);
    }
  }, [
    image,
    scale,
    mode,
    scaleMode,
    printWidth,
    printHeight,
    provider,
    onApply,
  ]);

  const displayed =
    upscaledImage && viewMode === 'upscaled' ? upscaledImage : image;
  const currentDpiAtPrint =
    scaleMode === 'smart-dpi' && printWidth && printHeight
      ? Math.round(
          Math.min(
            (image.naturalWidth || image.width) / parseFloat(printWidth || '1'),
            (image.naturalHeight || image.height) /
              parseFloat(printHeight || '1')
          )
        )
      : null;

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
            upscaledImage ? (
              <>
                {(['original', 'upscaled'] as const).map(m => (
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayed.src}
              alt="Working image"
              className="max-w-full max-h-full shadow-lg rounded block"
              style={{ maxHeight: 'calc(100vh - 280px)' }}
            />
          </div>
          {isUpscaling && <CanvasProcessingOverlay label="Upscaling…" />}
        </StudioCanvasFrame>

        <div className="w-full lg:w-72 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col overflow-y-auto">
          <div className="p-4 flex flex-col gap-4 flex-1">
            {/* Scale-mode toggle */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Scale Mode
              </label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setScaleMode('simple')}
                  disabled={isUpscaling}
                  className={`flex-1 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                    scaleMode === 'simple'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Simple
                </button>
                <button
                  type="button"
                  onClick={() => setScaleMode('smart-dpi')}
                  disabled={isUpscaling}
                  className={`flex-1 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                    scaleMode === 'smart-dpi'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Smart DPI
                </button>
              </div>
            </div>

            {scaleMode === 'simple' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Scale
                </label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  {([2, 4] as const).map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setScale(v)}
                      disabled={isUpscaling}
                      className={`flex-1 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                        scale === v
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {v}×
                    </button>
                  ))}
                </div>
              </div>
            )}

            {scaleMode === 'smart-dpi' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Print Width (in)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={printWidth}
                      onChange={e => handleWidthChange(e.target.value)}
                      placeholder="11"
                      disabled={isUpscaling}
                      className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Print Height (in)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={printHeight}
                      onChange={e => handleHeightChange(e.target.value)}
                      placeholder="14"
                      disabled={isUpscaling}
                      className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1.5">
                    Common DTF widths
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {DTF_PRESET_WIDTHS.map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          setPrintWidth(p.width.toString());
                          setPrintHeight(
                            (p.width / aspectRatioRef.current).toFixed(2)
                          );
                        }}
                        disabled={isUpscaling}
                        className="px-2 py-1 text-xs text-gray-700 border border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-md disabled:opacity-50"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {currentDpiAtPrint !== null && (
                  <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                    Current quality at this size:{' '}
                    <span className="font-semibold tabular-nums">
                      {currentDpiAtPrint} DPI
                    </span>
                    {currentDpiAtPrint < 300 && (
                      <span className="block mt-0.5 text-amber-700">
                        Will upscale to hit 300 DPI for clean prints.
                      </span>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Processing mode */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Mode
              </label>
              <select
                value={mode}
                onChange={e => setMode(e.target.value as UpscaleProcessingMode)}
                disabled={isUpscaling}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {PROCESSING_MODES.map(m => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {PROCESSING_MODES.find(m => m.value === mode)?.help}
              </p>
            </div>

            {/* Action button */}
            <button
              type="button"
              onClick={handleUpscale}
              disabled={isUpscaling}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isUpscaling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Upscaling…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {scaleMode === 'smart-dpi'
                    ? 'Upscale to 300 DPI'
                    : `Upscale ${scale}×`}
                </>
              )}
            </button>

            <p className="text-xs text-gray-400 mt-auto pt-2">
              Powered by {provider.label}. Each upscale costs 1 credit. When
              you&apos;re happy, use Save to Gallery in the header.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
