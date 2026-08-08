'use client';

/**
 * Upscale options popover for the Partner embed Studio.
 *
 * Mirrors the real DTF Editor upscale tool's controls (scale + processing mode
 * + face enhance) so the modal matches the app, and maps 1:1 onto the partner
 * upscale endpoint's inputs ({ scale, processingMode, faceEnhance }). Fully
 * self-contained — imports only shared UI primitives, never the consumer tool.
 */

import { useEffect, useRef } from 'react';
import { X, ArrowUpCircle } from 'lucide-react';

export type UpscaleProcessingMode =
  | 'auto_enhance'
  | 'generative_upscale'
  | 'basic_upscale';

export interface UpscaleOpts {
  scale: 2 | 4;
  processingMode: UpscaleProcessingMode;
  faceEnhance: boolean;
}

const MODES: { value: UpscaleProcessingMode; label: string; hint: string }[] = [
  {
    value: 'auto_enhance',
    label: 'Auto Enhance',
    hint: 'Balanced sharpening + detail (recommended).',
  },
  {
    value: 'generative_upscale',
    label: 'Generative',
    hint: 'AI reconstructs detail — best for small/soft art.',
  },
  {
    value: 'basic_upscale',
    label: 'Basic',
    hint: 'Plain resize, no enhancement.',
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  busy: boolean;
  value: UpscaleOpts;
  onChange: (v: UpscaleOpts) => void;
  onApply: () => void;
}

export function UpscaleOptions({
  open,
  onClose,
  busy,
  value,
  onChange,
  onApply,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Upscale options"
      className="absolute bottom-full left-0 z-50 mb-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
          <ArrowUpCircle className="h-4 w-4 text-blue-600" /> Upscale
        </span>
        <button
          onClick={onClose}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 p-3">
        {/* Scale */}
        <div>
          <p className="mb-1 text-xs font-medium text-gray-500">Scale</p>
          <div className="flex overflow-hidden rounded-lg border border-gray-200">
            {([2, 4] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => onChange({ ...value, scale: s })}
                className={`flex-1 px-3 py-1.5 text-sm font-medium ${
                  value.scale === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        {/* Mode */}
        <div>
          <p className="mb-1 text-xs font-medium text-gray-500">Mode</p>
          <div className="space-y-1">
            {MODES.map(m => (
              <button
                key={m.value}
                type="button"
                onClick={() => onChange({ ...value, processingMode: m.value })}
                className={`w-full rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                  value.processingMode === m.value
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <span className="block text-sm font-medium text-gray-800">
                  {m.label}
                </span>
                <span className="block text-[11px] leading-tight text-gray-500">
                  {m.hint}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Face enhance */}
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={value.faceEnhance}
            onChange={e =>
              onChange({ ...value, faceEnhance: e.target.checked })
            }
            className="h-4 w-4 accent-blue-600"
          />
          Enhance faces
        </label>

        <button
          type="button"
          onClick={onApply}
          disabled={busy}
          className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? 'Upscaling…' : 'Apply upscale'}
        </button>
      </div>
    </div>
  );
}
