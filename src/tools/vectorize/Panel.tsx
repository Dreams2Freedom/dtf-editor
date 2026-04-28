'use client';

/**
 * Vectorize tool — Studio plugin Panel (Phase 2.1).
 *
 * Single-image vectorize UI conforming to StudioToolPanelProps. Calls
 * Vectorizer.ai via the existing /api/process endpoint (which handles
 * credit deduction and gallery save) and rasters the resulting SVG so
 * the Studio can chain it into the next tool.
 *
 * The richer /process/vectorize standalone page (PDF format, before/after
 * comparison) stays as-is for now — Step 6 will reduce that route to a
 * thin wrapper around this same Panel once the contract stabilizes.
 */

import { useCallback, useState } from 'react';
import { Loader2, Zap, Download } from 'lucide-react';

import type { StudioToolPanelProps } from '../types';

import { vectorizerAiProvider } from './providers/vectorizerAi';
import type { VectorizeProvider } from './providers/types';

const DEFAULT_PROVIDER: VectorizeProvider = vectorizerAiProvider;

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

export function VectorizePanel({
  image,
  onApply,
  onCancel,
}: StudioToolPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const provider = DEFAULT_PROVIDER;

  const handleVectorize = useCallback(async () => {
    setError(null);
    setIsProcessing(true);
    try {
      const blob = await imageToBlob(image);
      const result = await provider.run(blob, { format: 'svg' });
      setResultUrl(result.url);
      // Raster the SVG so the Studio can chain into the next tool.
      const rasterized = await loadImageFromUrl(result.url);
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

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-purple-200 bg-purple-50/60 p-3 text-xs text-purple-900">
        <p className="font-medium mb-1">SVG Vectorization</p>
        <p className="text-purple-800/90">
          Converts your raster image into a clean scalable vector. Best for
          logos, text, and graphics with solid color regions.
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

      {resultUrl && (
        <a
          href={resultUrl}
          download="vectorized.svg"
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Download SVG
        </a>
      )}

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded-lg disabled:opacity-50"
        >
          Back
        </button>
      )}

      <p className="text-xs text-gray-400 mt-2">
        Powered by {provider.label}. Each vectorize costs 2 credits.
      </p>
    </div>
  );
}
