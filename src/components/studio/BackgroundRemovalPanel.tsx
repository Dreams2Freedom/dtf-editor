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
} from 'lucide-react';

import { useBackgroundRemoval } from '@/hooks/useBackgroundRemoval';
import type { BgRemovalModel } from '@/types/backgroundRemoval';

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
  removing: 'Removing background...',
  embedding: 'Preparing image for SAM...',
  predicting: 'Running SAM prediction...',
  done: 'Done!',
  error: '',
};

const MODELS: { value: BgRemovalModel; label: string }[] = [
  { value: 'isnet-general-use', label: 'Standard (ISNet)' },
  { value: 'u2net', label: 'Fast (U2Net)' },
  { value: 'u2net_human_seg', label: 'People & Portraits' },
  { value: 'isnet-anime', label: 'Anime / Illustrations' },
];

export function BackgroundRemovalPanel({
  image,
  onSave,
  onCancel,
  savedImageId,
  advancedBgUrl,
}: BackgroundRemovalPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<BgRemovalModel>('isnet-general-use');
  const [isSaving, setIsSaving] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  const { status, error, runAutoRemoval, reset } = useBackgroundRemoval();

  // Initialise offscreen canvas from image
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(image, 0, 0);
    canvasRef.current = canvas;

    // Also draw original into preview
    if (previewRef.current) {
      const pCtx = previewRef.current.getContext('2d');
      if (pCtx) {
        previewRef.current.width = canvas.width;
        previewRef.current.height = canvas.height;
        pCtx.drawImage(canvas, 0, 0);
      }
    }
  }, [image]);

  const handleRemove = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setUpgradeRequired(false);

    const resultImg = await runAutoRemoval(canvas, model);

    if (!resultImg) {
      // Check if it was an upgrade error from the service layer
      // The error comes back via the hook's error state — we surface it below
      return;
    }

    // Draw result onto the offscreen canvas (preserves transparency)
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(resultImg, 0, 0, canvas.width, canvas.height);

    // Update preview
    if (previewRef.current) {
      const pCtx = previewRef.current.getContext('2d');
      if (pCtx) {
        previewRef.current.width = canvas.width;
        previewRef.current.height = canvas.height;
        pCtx.clearRect(0, 0, canvas.width, canvas.height);
        pCtx.drawImage(canvas, 0, 0);
      }
    }

    setHasResult(true);
  }, [runAutoRemoval, model]);

  // Detect upgrade-required errors from the hook
  useEffect(() => {
    if (error && (error.includes('403') || error.includes('Upgrade'))) {
      setUpgradeRequired(true);
    }
  }, [error]);

  const handleReset = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);

    if (previewRef.current) {
      const pCtx = previewRef.current.getContext('2d');
      if (pCtx) {
        previewRef.current.width = canvas.width;
        previewRef.current.height = canvas.height;
        pCtx.drawImage(image, 0, 0);
      }
    }

    setHasResult(false);
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

  const isProcessing = ['authorizing', 'removing', 'embedding', 'predicting'].includes(status);

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
              <a href={advancedBgUrl || '/process/background-removal'} className="font-medium underline hover:text-amber-900">
                Advanced remover
              </a>{' '}
              (1 credit).
            </p>
          </div>
        </div>
      )}

      {/* Error banner (non-upgrade errors) */}
      {error && !upgradeRequired && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="max-w-[1800px] mx-auto flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800 flex-1">{error}</p>
            <button onClick={reset} className="text-xs text-red-600 hover:text-red-800">Dismiss</button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Canvas preview */}
        <div
          className="flex-1 flex items-center justify-center min-h-[300px] overflow-hidden p-4"
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
          />
        </div>

        {/* Side panel */}
        <div className="w-full lg:w-72 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col overflow-y-auto">
          <div className="p-4 flex flex-col gap-4 flex-1">
            {/* Model selector */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Model</label>
              <select
                value={model}
                onChange={e => setModel(e.target.value as BgRemovalModel)}
                disabled={isProcessing}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {MODELS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Remove button */}
            <button
              onClick={handleRemove}
              disabled={isProcessing}
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
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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
                Need cleaner edges (hair, fur, fine detail)?
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

      {/* Footer actions */}
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
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
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
