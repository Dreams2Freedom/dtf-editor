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

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

import {
  StudioCanvasFrame,
  CanvasProcessingOverlay,
} from '@/components/studio/StudioCanvasFrame';
import type { StudioToolPanelProps } from '../types';

import { thingDitherProvider } from './providers/thingDither';
import {
  DEFAULT_HALFTONE_OPTIONS,
  type HalftoneAlgorithm,
  type HalftoneOptions,
  type OrderedSize,
} from './types';

type ViewMode = 'original' | 'halftone';

const ALGORITHMS: { value: HalftoneAlgorithm; label: string; help: string }[] =
  [
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<HTMLImageElement | null>(
    null
  );
  const [viewMode, setViewMode] = useState<ViewMode>('original');
  const [zoom, setZoom] = useState(1);

  // Reset preview if the working image changes (chained from another tool).
  useEffect(() => {
    setPreviewImage(null);
    setViewMode('original');
    setError(null);
  }, [image]);

  const updateOption = useCallback(
    <K extends keyof HalftoneOptions>(key: K, value: HalftoneOptions[K]) => {
      setOpts(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleApply = useCallback(async () => {
    setError(null);
    setIsProcessing(true);
    try {
      const result = await thingDitherProvider.run(image, opts);

      // Tier check / credit deduction. Throws if the user's out of
      // credits and over their monthly free limit.
      try {
        await onCommit(result.canvas);
      } catch (gateErr) {
        const msg =
          gateErr instanceof Error ? gateErr.message : 'Halftone gate failed';
        setError(msg);
        return;
      }

      // Build a previewable HTMLImageElement from the canvas so the
      // view-mode pill can swap between Original and Halftone.
      const blob: Blob | null = await new Promise(resolve =>
        result.canvas.toBlob(resolve, 'image/png')
      );
      if (!blob) throw new Error('Halftone export failed');
      const url = URL.createObjectURL(blob);
      const preview = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load halftone'));
        img.src = url;
      });
      setPreviewImage(preview);
      setViewMode('halftone');

      onApply(result.canvas, {
        operation: 'halftone',
        provider: thingDitherProvider.id,
        modelId: opts.algorithm,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Halftone failed';
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  }, [image, opts, onApply, onCommit]);

  const displayed =
    previewImage && viewMode === 'halftone' ? previewImage : image;

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
            previewImage ? (
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayed.src}
              alt="Working image"
              className="max-w-full max-h-full shadow-lg rounded block"
              style={{ maxHeight: 'calc(100vh - 280px)' }}
            />
          </div>
          {isProcessing && <CanvasProcessingOverlay label="Halftoning…" />}
        </StudioCanvasFrame>

        <div className="w-full lg:w-72 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col overflow-y-auto">
          <div className="p-4 flex flex-col gap-4 flex-1">
            <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-900">
              <p className="font-medium mb-1">DTF Halftone</p>
              <p className="text-blue-800/90">
                Outputs a transparent PNG of black dots — your RIP software
                handles the white underbase.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Algorithm
              </label>
              <div className="grid grid-cols-3 rounded-lg border border-gray-200 overflow-hidden">
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

            <button
              type="button"
              onClick={handleApply}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Halftoning…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Apply Halftone
                </>
              )}
            </button>

            <p className="text-xs text-gray-400 mt-auto pt-2">
              Free on Starter plans and above. Basic and Free plans pay 1 credit
              per halftone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
