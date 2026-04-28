'use client';

/**
 * Upscale tool — Studio plugin Panel (Phase 2.0).
 *
 * Single-image upscale UI that fits the StudioToolPanelProps contract.
 * The bigger /process/upscale page (with its bulk flow, DPI-aware mode,
 * and full marketing copy) stays as-is for the standalone route; Step 6
 * reduces that route to a thin wrapper around this same Panel.
 *
 * Provider abstraction: the Panel calls a single UpscaleProvider whose
 * implementation hits whichever upstream API. Swapping providers is a
 * one-line registry change with zero Panel edits.
 */

import { useCallback, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

import type { StudioToolPanelProps } from '../types';

import { deepImageProvider } from './providers/deepImage';
import type {
  UpscaleOptions,
  UpscaleProcessingMode,
  UpscaleProvider,
} from './providers/types';

const PROCESSING_MODES: { value: UpscaleProcessingMode; label: string; help: string }[] = [
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

const DEFAULT_PROVIDER: UpscaleProvider = deepImageProvider;

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

export function UpscalePanel({ image, onApply, onCancel }: StudioToolPanelProps) {
  const [scale, setScale] = useState<2 | 4>(4);
  const [mode, setMode] = useState<UpscaleProcessingMode>('auto_enhance');
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const provider = DEFAULT_PROVIDER;

  const handleUpscale = useCallback(async () => {
    setError(null);
    setIsUpscaling(true);
    try {
      const blob = await imageToBlob(image);
      const opts: UpscaleOptions = { scale, processingMode: mode };
      const result = await provider.run(blob, opts);
      const upscaled = await loadImageFromUrl(result.url);
      const canvas = imageToCanvas(upscaled);
      onApply(canvas, {
        operation: `upscale_${scale}x`,
        provider: provider.id,
        modelId: mode,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upscale failed';
      setError(msg);
    } finally {
      setIsUpscaling(false);
    }
  }, [image, scale, mode, provider, onApply]);

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </div>
      )}

      {/* Scale toggle */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Scale</label>
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

      {/* Processing mode */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Mode</label>
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

      {/* Action buttons */}
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
            Upscale {scale}×
          </>
        )}
      </button>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={isUpscaling}
          className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded-lg disabled:opacity-50"
        >
          Back
        </button>
      )}

      <p className="text-xs text-gray-400 mt-2">
        Powered by {provider.label}. Each upscale costs 1 credit.
      </p>
    </div>
  );
}
