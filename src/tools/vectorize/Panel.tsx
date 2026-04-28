'use client';

/**
 * Vectorize tool — Studio plugin Panel (Phase 2.2 + multi-format).
 *
 * Layout matches BG Removal / Upscale: shared StudioCanvasFrame on the
 * left with the working image, vertical right-hand sidebar with controls.
 * While Vectorizer.ai is in flight we overlay a processing animation.
 * Once done, the user can compare via an Original / Vectorized view-mode
 * pill in the canvas top-left, then download in their format of choice.
 *
 * Output formats:
 *   - SVG  (the API response, free)
 *   - PNG  (rasterized client-side from the SVG, free)
 *   - PDF  (separate API call with format=pdf, costs additional credits)
 *
 * The first SVG call also rasters the SVG to a PNG canvas at the
 * ORIGINAL image's dimensions (not the SVG's intrinsic 300×150 default)
 * so the result fills the canvas like the other tools and chains
 * cleanly into Upscale / Color Change. PDF is download-only — it does
 * not feed into the working image since we can't easily raster PDFs.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Zap, Download, FileType } from 'lucide-react';

import {
  StudioCanvasFrame,
  CanvasProcessingOverlay,
} from '@/components/studio/StudioCanvasFrame';
import type { StudioToolPanelProps } from '../types';

import { vectorizerAiProvider } from './providers/vectorizerAi';
import type { VectorizeProvider } from './providers/types';

const DEFAULT_PROVIDER: VectorizeProvider = vectorizerAiProvider;

type ViewMode = 'original' | 'vectorized';

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

/**
 * Load an SVG URL into an HTMLImageElement and rasterize it to a canvas
 * at the explicitly-requested dimensions. Without explicit width/height
 * the browser falls back to the SVG's intrinsic size (often 300×150),
 * which made post-vectorize results render as a tiny thumbnail.
 */
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vectorizedImage, setVectorizedImage] =
    useState<HTMLImageElement | null>(null);
  const [svgUrl, setSvgUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('original');
  const [zoom, setZoom] = useState(1);

  // Cache the rasterized PNG canvas so the PNG-download button is free
  // (no re-rasterization on every click).
  const rasterCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const provider = DEFAULT_PROVIDER;

  // Reset result if the working image changes (chained from another tool).
  useEffect(() => {
    setVectorizedImage(null);
    setSvgUrl(null);
    rasterCanvasRef.current = null;
    setViewMode('original');
    setError(null);
  }, [image]);

  const handleVectorize = useCallback(async () => {
    setError(null);
    setIsProcessing(true);
    try {
      const blob = await imageToBlob(image);
      const result = await provider.run(blob, { format: 'svg' });

      // Rasterize the SVG at the ORIGINAL image's dimensions so the
      // result fills the canvas (and chains correctly into Upscale,
      // Color Change, etc.) instead of falling back to the SVG's
      // intrinsic 300×150.
      const targetW = image.naturalWidth || image.width;
      const targetH = image.naturalHeight || image.height;
      const rasterCanvas = await rasterizeSvgAtSize(
        result.url,
        targetW,
        targetH
      );
      rasterCanvasRef.current = rasterCanvas;

      const rasterized = await canvasToImageElement(rasterCanvas);
      setVectorizedImage(rasterized);
      setSvgUrl(result.url);
      setViewMode('vectorized');

      onApply(rasterCanvas, {
        operation: 'vectorization',
        provider: provider.id,
        modelId: 'svg',
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Vectorize failed';
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  }, [image, provider, onApply]);

  const handleDownloadSvg = useCallback(() => {
    if (!svgUrl) return;
    triggerDownload(svgUrl, `vectorized-${Date.now()}.svg`);
  }, [svgUrl]);

  const handleDownloadPng = useCallback(() => {
    const canvas = rasterCanvasRef.current;
    if (!canvas) return;
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `vectorized-${Date.now()}.png`);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }, 'image/png');
  }, []);

  /** PDF requires a separate API call with format=pdf. Costs another
   *  Vectorizer.ai charge — clearly noted on the button. */
  const handleDownloadPdf = useCallback(async () => {
    setError(null);
    setIsDownloadingPdf(true);
    try {
      const blob = await imageToBlob(image);
      const result = await provider.run(blob, { format: 'pdf' });
      triggerDownload(result.url, `vectorized-${Date.now()}.pdf`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'PDF generation failed';
      setError(msg);
    } finally {
      setIsDownloadingPdf(false);
    }
  }, [image, provider]);

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

            {!hasResult ? (
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
                    Vectorize
                  </>
                )}
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Download
                </p>
                <button
                  type="button"
                  onClick={handleDownloadSvg}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                  title="Download the vector source — opens in Illustrator, Inkscape, etc."
                >
                  <FileType className="w-3.5 h-3.5" />
                  SVG
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors"
                  title="Rasterized PNG at original image dimensions"
                >
                  <Download className="w-3.5 h-3.5" />
                  PNG
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors disabled:opacity-60"
                  title="PDF (print-ready). Requires a second Vectorizer.ai call — costs an extra 2 credits."
                >
                  {isDownloadingPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileType className="w-3.5 h-3.5" />
                  )}
                  PDF (+2 credits)
                </button>
              </div>
            )}

            <p className="text-xs text-gray-400 mt-auto pt-2">
              Powered by {provider.label}. Vectorize costs 2 credits per call.
              SVG and PNG download from the same call. PDF triggers a
              separate call when clicked.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
