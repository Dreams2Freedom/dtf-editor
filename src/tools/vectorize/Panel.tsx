'use client';

/**
 * Vectorize tool — Studio plugin Panel (Phase 2.2 + format-up-front).
 *
 * Flow:
 *   1. User picks output format up front: SVG / PNG / PDF.
 *   2. Vectorize fires a single API call (one credit charge).
 *   3. The chosen file auto-downloads when the call completes.
 *
 * For SVG and PNG choices we hit Vectorizer.ai once with format=svg
 * (the most flexible source of truth), then either:
 *   - SVG: download the API's SVG file directly, AND rasterize it on the
 *     client at the ORIGINAL image's dimensions for the working image
 *     (so chaining into Upscale / Color Change works at the right size).
 *   - PNG: same call → rasterize at original dimensions client-side and
 *     download that PNG. Working image is the same canvas.
 *
 * For PDF we call with format=pdf and download the result. The working
 * image stays unchanged because rastering a PDF client-side is
 * impractical — PDF is a "terminal" format here.
 *
 * Single click, single charge. The format selector replaces the old
 * post-vectorize three-button download row.
 */

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Zap } from 'lucide-react';

import {
  StudioCanvasFrame,
  CanvasProcessingOverlay,
} from '@/components/studio/StudioCanvasFrame';
import type { StudioToolPanelProps } from '../types';

import { vectorizerAiProvider } from './providers/vectorizerAi';
import type { VectorizeProvider } from './providers/types';

const DEFAULT_PROVIDER: VectorizeProvider = vectorizerAiProvider;

type ViewMode = 'original' | 'vectorized';
type OutputFormat = 'svg' | 'png' | 'pdf';

const FORMAT_OPTIONS: {
  value: OutputFormat;
  label: string;
  help: string;
}[] = [
  {
    value: 'svg',
    label: 'SVG',
    help: 'Editable vector — Illustrator, Inkscape, web.',
  },
  {
    value: 'png',
    label: 'PNG',
    help: 'Crisp raster at your original image size.',
  },
  {
    value: 'pdf',
    label: 'PDF',
    help: 'Print-ready vector — best for print shops.',
  },
];

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

function rasterizeSvgAtSize(
  svgUrl: string,
  width: number,
  height: number
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get 2D context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas);
    };
    img.onerror = () => reject(new Error('Failed to load vectorized SVG'));
    img.src = svgUrl;
  });
}

function canvasToImageElement(
  canvas: HTMLCanvasElement
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('canvas.toBlob failed'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load PNG'));
      img.src = url;
    }, 'image/png');
  });
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function VectorizePanel({ image, onApply }: StudioToolPanelProps) {
  const [format, setFormat] = useState<OutputFormat>('svg');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vectorizedImage, setVectorizedImage] =
    useState<HTMLImageElement | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('original');
  const [zoom, setZoom] = useState(1);

  const provider = DEFAULT_PROVIDER;

  // Reset result if the working image changes (chained from another tool).
  useEffect(() => {
    setVectorizedImage(null);
    setViewMode('original');
    setError(null);
  }, [image]);

  const handleVectorize = useCallback(async () => {
    setError(null);
    setIsProcessing(true);
    try {
      const blob = await imageToBlob(image);
      const stamp = Date.now();

      if (format === 'pdf') {
        // PDF path: terminal download, no working-image update.
        const result = await provider.run(blob, { format: 'pdf' });
        triggerDownload(result.url, `vectorized-${stamp}.pdf`);
        return;
      }

      // SVG and PNG share a single SVG call — we either download the
      // SVG file directly or rasterize it at original dimensions for
      // the PNG download.
      const result = await provider.run(blob, { format: 'svg' });
      const targetW = image.naturalWidth || image.width;
      const targetH = image.naturalHeight || image.height;
      const rasterCanvas = await rasterizeSvgAtSize(
        result.url,
        targetW,
        targetH
      );

      if (format === 'svg') {
        triggerDownload(result.url, `vectorized-${stamp}.svg`);
      } else {
        // format === 'png'
        const dataUrl = rasterCanvas.toDataURL('image/png');
        triggerDownload(dataUrl, `vectorized-${stamp}.png`);
      }

      // Update Studio's working image so chained tools see the
      // vectorized result. Only meaningful for SVG / PNG paths since
      // both are raster-friendly.
      const rasterized = await canvasToImageElement(rasterCanvas);
      setVectorizedImage(rasterized);
      setViewMode('vectorized');
      onApply(rasterCanvas, {
        operation: 'vectorization',
        provider: provider.id,
        modelId: format,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Vectorize failed';
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  }, [image, format, provider, onApply]);

  const displayed =
    vectorizedImage && viewMode === 'vectorized' ? vectorizedImage : image;
  const hasResult = vectorizedImage !== null;

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
            hasResult ? (
              <>
                {(['original', 'vectorized'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setViewMode(m)}
                    className={`px-3 py-1 transition-colors capitalize ${
                      viewMode === m
                        ? 'bg-purple-600 text-white'
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
          {isProcessing && <CanvasProcessingOverlay label="Vectorizing…" />}
        </StudioCanvasFrame>

        <div className="w-full lg:w-72 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col overflow-y-auto">
          <div className="p-4 flex flex-col gap-4 flex-1">
            <div className="rounded-lg border border-purple-200 bg-purple-50/60 p-3 text-xs text-purple-900">
              <p className="font-medium mb-1">SVG Vectorization</p>
              <p className="text-purple-800/90">
                Converts your raster image into a clean scalable vector. Best
                for logos, text, and graphics with solid color regions.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Output Format
              </label>
              <div className="grid grid-cols-3 rounded-lg border border-gray-200 overflow-hidden">
                {FORMAT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormat(opt.value)}
                    disabled={isProcessing}
                    className={`py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                      format === opt.value
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {FORMAT_OPTIONS.find(o => o.value === format)?.help}
              </p>
            </div>

            <button
              type="button"
              onClick={handleVectorize}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Vectorizing…
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Vectorize &amp; Download {format.toUpperCase()}
                </>
              )}
            </button>

            <p className="text-xs text-gray-400 mt-auto pt-2">
              Powered by {provider.label}. Vectorize costs 2 credits per call.
              Single call regardless of format.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
