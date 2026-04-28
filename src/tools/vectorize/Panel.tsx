'use client';

/**
 * Vectorize tool — Studio plugin Panel (Phase 2.2).
 *
 * Layout matches BG Removal / Upscale: shared StudioCanvasFrame on the
 * left with the working image, vertical right-hand sidebar with controls.
 * While Vectorizer.ai is in flight we overlay a processing animation.
 * Once done, the user can compare via an Original / Vectorized view-mode
 * pill in the canvas top-left, then Studio's Save to Gallery commits.
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
    img.onerror = () => reject(new Error('Failed to load vectorized image'));
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

export function VectorizePanel({ image, onApply }: StudioToolPanelProps) {
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
      const result = await provider.run(blob, { format: 'svg' });
      const rasterized = await loadImageFromUrl(result.url);
      setVectorizedImage(rasterized);
      setViewMode('vectorized');
      const canvas = imageToCanvas(rasterized);
      onApply(canvas, {
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

  const displayed =
    vectorizedImage && viewMode === 'vectorized' ? vectorizedImage : image;

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
            vectorizedImage ? (
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

            <p className="text-xs text-gray-400 mt-auto pt-2">
              Powered by {provider.label}. Each vectorize costs 2 credits. When
              you&apos;re happy, hit Download in the header.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
