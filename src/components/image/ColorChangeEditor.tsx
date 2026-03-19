'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Undo2, Redo2, RotateCcw, Loader2 } from 'lucide-react';
import { ColorPicker } from './color-change/ColorPicker';
import { ChangesHistory } from './color-change/ChangesHistory';
import { clickSelect, lassoSelect } from './color-change/SelectionTools';
import { applyColorShift, restorePixels, getPixelColor, hexToRgb, pointInPolygon } from '@/lib/color-utils';
import { useColorChangeHistory } from '@/hooks/useColorChangeHistory';
import { SelectionMode, SelectionMask, RGBColor } from '@/types/colorChange';

const ColorCanvas = dynamic(
  () => import('./color-change/ColorCanvas').then(m => ({ default: m.ColorCanvas })),
  { ssr: false, loading: () => <div className="flex-1 min-h-[300px] flex items-center justify-center bg-gray-100"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div> }
);

interface ColorChangeEditorProps {
  image: HTMLImageElement;
  usageRemaining: number;
  usageLimit: number;
  onSave: (canvas: HTMLCanvasElement) => Promise<void>;
  onCancel: () => void;
}

export function ColorChangeEditor({
  image,
  usageRemaining,
  usageLimit,
  onSave,
  onCancel,
}: ColorChangeEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('click');
  const [tolerance, setTolerance] = useState(20);
  const [currentMask, setCurrentMask] = useState<SelectionMask | null>(null);
  const [sourceColor, setSourceColor] = useState<RGBColor | null>(null);
  const [targetColor, setTargetColor] = useState('#2563eb');
  const [isSaving, setIsSaving] = useState(false);
  const [lassoPolygon, setLassoPolygon] = useState<Array<{ x: number; y: number }> | null>(null);
  // Incremented to force Konva to re-read the canvas pixels after changes
  const [renderKey, setRenderKey] = useState(0);

  const history = useColorChangeHistory();

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(image, 0, 0);
    canvasRef.current = canvas;
    setImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
  }, [image]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const refreshImageData = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
    // Force Konva to re-read the canvas by bumping the key
    setRenderKey(prev => prev + 1);
  }, []);

  const handlePixelClick = useCallback((x: number, y: number, mode: 'replace' | 'add' | 'subtract') => {
    // Read fresh pixel data from the offscreen canvas for accurate selection
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const freshData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    let newClickMask: SelectionMask;
    if (lassoPolygon) {
      newClickMask = lassoSelect(freshData, x, y, tolerance, lassoPolygon);
      setLassoPolygon(null);
    } else {
      newClickMask = clickSelect(freshData, x, y, tolerance);
    }

    // Combine with existing mask based on mode
    if (mode === 'add' && currentMask) {
      // Union: add new pixels to existing selection
      const combined = new Uint8Array(currentMask.data.length);
      let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
      for (let i = 0; i < combined.length; i++) {
        if (currentMask.data[i] === 1 || newClickMask.data[i] === 1) {
          combined[i] = 1;
          const px = i % canvas.width;
          const py = Math.floor(i / canvas.width);
          minX = Math.min(minX, px);
          minY = Math.min(minY, py);
          maxX = Math.max(maxX, px);
          maxY = Math.max(maxY, py);
        }
      }
      if (maxX < minX) { minX = 0; minY = 0; maxX = 0; maxY = 0; }
      setCurrentMask({ data: combined, width: canvas.width, height: canvas.height, bounds: { minX, minY, maxX, maxY } });
    } else if (mode === 'subtract' && currentMask) {
      // Subtract: remove matching pixels from existing selection
      const combined = new Uint8Array(currentMask.data.length);
      let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
      for (let i = 0; i < combined.length; i++) {
        if (currentMask.data[i] === 1 && newClickMask.data[i] !== 1) {
          combined[i] = 1;
          const px = i % canvas.width;
          const py = Math.floor(i / canvas.width);
          minX = Math.min(minX, px);
          minY = Math.min(minY, py);
          maxX = Math.max(maxX, px);
          maxY = Math.max(maxY, py);
        }
      }
      if (maxX < minX) { minX = 0; minY = 0; maxX = 0; maxY = 0; }
      setCurrentMask({ data: combined, width: canvas.width, height: canvas.height, bounds: { minX, minY, maxX, maxY } });
    } else {
      // Replace: new selection replaces old
      setCurrentMask(newClickMask);
    }

    setSourceColor(getPixelColor(freshData, x, y));
  }, [tolerance, lassoPolygon, currentMask]);

  const handleLassoComplete = useCallback((polygon: Array<{ x: number; y: number }>, mode: 'trim' | 'add' | 'subtract') => {
    if (!currentMask || !sourceColor) {
      // No selection yet — store polygon for next click
      setLassoPolygon(polygon);
      setSelectionMode('click');
      return;
    }

    const w = currentMask.width;
    const h = currentMask.height;

    if (mode === 'add') {
      // Shift+Lasso: keep existing selection + add color-matching pixels inside lasso
      // Re-runs global color match inside the lasso area and unions with current mask
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const freshData = ctx.getImageData(0, 0, w, h);

      const result = new Uint8Array(currentMask.data.length);
      let minX = w, minY = h, maxX = 0, maxY = 0;

      for (let i = 0; i < result.length; i++) {
        const px = i % w;
        const py = Math.floor(i / w);

        // Keep all existing selected pixels
        if (currentMask.data[i] === 1) {
          result[i] = 1;
          minX = Math.min(minX, px); minY = Math.min(minY, py);
          maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
          continue;
        }

        // Add: color-matching pixels inside the new lasso area
        if (pointInPolygon(px, py, polygon)) {
          const idx = i * 4;
          if (freshData.data[idx + 3] === 0) continue;
          const dr = Math.abs(freshData.data[idx] - sourceColor.r);
          const dg = Math.abs(freshData.data[idx + 1] - sourceColor.g);
          const db = Math.abs(freshData.data[idx + 2] - sourceColor.b);
          if (dr <= tolerance && dg <= tolerance && db <= tolerance) {
            result[i] = 1;
            minX = Math.min(minX, px); minY = Math.min(minY, py);
            maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
          }
        }
      }

      if (maxX < minX) { minX = 0; minY = 0; maxX = 0; maxY = 0; }
      setCurrentMask({ data: result, width: w, height: h, bounds: { minX, minY, maxX, maxY } });
      return;
    }

    // Trim or Subtract
    const result = new Uint8Array(currentMask.data.length);
    let minX = w, minY = h, maxX = 0, maxY = 0;

    for (let i = 0; i < currentMask.data.length; i++) {
      const px = i % w;
      const py = Math.floor(i / w);
      const insideLasso = pointInPolygon(px, py, polygon);
      const wasSelected = currentMask.data[i] === 1;

      // Trim: keep selected pixels INSIDE lasso only
      // Subtract: remove selected pixels INSIDE lasso
      const keep = mode === 'trim'
        ? (wasSelected && insideLasso)
        : (wasSelected && !insideLasso);

      if (keep) {
        result[i] = 1;
        minX = Math.min(minX, px); minY = Math.min(minY, py);
        maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
      }
    }

    if (maxX < minX) { minX = 0; minY = 0; maxX = 0; maxY = 0; }
    setCurrentMask({ data: result, width: w, height: h, bounds: { minX, minY, maxX, maxY } });
  }, [currentMask, sourceColor, tolerance]);

  const handleApply = useCallback(() => {
    if (!currentMask || !sourceColor || !canvasRef.current) return;
    const target = hexToRgb(targetColor);
    if (sourceColor.r === target.r && sourceColor.g === target.g && sourceColor.b === target.b) return;

    // Read fresh pixel data from the offscreen canvas (not stale React state)
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const freshImageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);

    const originalPixels = applyColorShift(freshImageData, currentMask, sourceColor, target);

    ctx.putImageData(freshImageData, 0, 0);

    history.pushChange({
      id: crypto.randomUUID(),
      mask: currentMask,
      sourceColor,
      targetColor: target,
      originalPixels,
    });

    setCurrentMask(null);
    setSourceColor(null);
    refreshImageData();
  }, [currentMask, sourceColor, targetColor, imageData, history, refreshImageData]);

  const handleUndo = useCallback(() => {
    const entry = history.undo();
    if (!entry || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    restorePixels(imgData, entry.mask, entry.originalPixels);
    ctx.putImageData(imgData, 0, 0);
    refreshImageData();
  }, [history, refreshImageData]);

  const handleRedo = useCallback(() => {
    const entry = history.redo();
    if (!entry || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    applyColorShift(imgData, entry.mask, entry.sourceColor, entry.targetColor);
    ctx.putImageData(imgData, 0, 0);
    refreshImageData();
  }, [history, refreshImageData]);

  const handleResetAll = useCallback(() => {
    const entries = history.resetAll();
    if (!canvasRef.current || entries.length === 0) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(image, 0, 0);
    setCurrentMask(null);
    setSourceColor(null);
    refreshImageData();
  }, [history, image, refreshImageData]);

  const handleRemoveChange = useCallback((id: string) => {
    const removed = history.removeEntry(id);
    if (!removed || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(image, 0, 0);
    for (const entry of history.changes) {
      const imgData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
      applyColorShift(imgData, entry.mask, entry.sourceColor, entry.targetColor);
      ctx.putImageData(imgData, 0, 0);
    }
    refreshImageData();
  }, [history, image, refreshImageData]);

  const handleSave = useCallback(async () => {
    if (!canvasRef.current) return;
    setIsSaving(true);
    try {
      await onSave(canvasRef.current);
    } finally {
      setIsSaving(false);
    }
  }, [onSave]);

  if (!imageData) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-3 bg-white border-b border-gray-200 flex-wrap">
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setSelectionMode('click')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${selectionMode === 'click' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
          >Click Select</button>
          <button
            onClick={() => setSelectionMode('lasso')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${selectionMode === 'lasso' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
          >Lasso</button>
        </div>

        <div className="h-6 w-px bg-gray-200" />

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Tolerance:</span>
          <input type="range" min={0} max={100} value={tolerance} onChange={e => setTolerance(Number(e.target.value))} className="w-28" />
          <span className="text-xs font-semibold text-gray-700 w-6">{tolerance}</span>
        </div>

        <div className="h-6 w-px bg-gray-200" />

        <button onClick={handleUndo} disabled={!history.canUndo} className="p-1.5 border border-gray-200 rounded-md text-gray-500 disabled:opacity-30" title="Undo (Ctrl+Z)"><Undo2 className="w-4 h-4" /></button>
        <button onClick={handleRedo} disabled={!history.canRedo} className="p-1.5 border border-gray-200 rounded-md text-gray-500 disabled:opacity-30" title="Redo (Ctrl+Shift+Z)"><Redo2 className="w-4 h-4" /></button>

        <div className="flex-1" />

        <button onClick={handleResetAll} disabled={history.changeCount === 0} className="px-3 py-1.5 border border-gray-200 rounded-md text-xs text-gray-500 disabled:opacity-30">
          <RotateCcw className="w-3 h-3 inline mr-1" />Reset All
        </button>
      </div>

      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        <ColorCanvas
          key={renderKey}
          image={image}
          editCanvas={canvasRef.current}
          imageData={imageData}
          selectionMode={selectionMode}
          currentMask={currentMask}
          onPixelClick={handlePixelClick}
          onLassoComplete={handleLassoComplete}
        />

        <div className="w-full md:w-[280px] bg-white border-t md:border-t-0 md:border-l border-gray-200 p-4 overflow-y-auto space-y-4">
          <ColorPicker
            sourceColor={sourceColor}
            targetColor={targetColor}
            onTargetColorChange={setTargetColor}
          />

          <button
            onClick={handleApply}
            disabled={!currentMask || !sourceColor}
            className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors"
          >
            Apply Color Change
          </button>

          {/* Selection hints */}
          <div className="text-xs text-gray-400 space-y-1 p-2 bg-gray-50 rounded-lg">
            <p className="font-semibold text-gray-500 mb-1">Click Select mode:</p>
            <p><strong>Click</strong> — select a color</p>
            <p><strong>Shift+Click</strong> — add more shades</p>
            <p><strong>Alt+Click</strong> — remove shade</p>
            <p className="font-semibold text-gray-500 mt-2 mb-1">Lasso mode:</p>
            <p><strong>Draw</strong> — trim to area</p>
            <p><strong>Shift+Draw</strong> — add area</p>
            <p><strong>Alt+Draw</strong> — remove area</p>
          </div>

          <ChangesHistory
            changes={history.changes}
            onRemoveChange={handleRemoveChange}
          />
        </div>
      </div>

      <div className="flex items-center justify-between p-3 bg-white border-t border-gray-200">
        <span className="text-xs text-gray-500">
          {usageRemaining > 0
            ? `${usageLimit - usageRemaining} of ${usageLimit} free color changes used this month`
            : 'Free color changes used — saving will cost 1 credit'}
        </span>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
          <button
            onClick={handleSave}
            disabled={isSaving || history.changeCount === 0}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-semibold rounded-lg text-sm transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save to Gallery'}
          </button>
        </div>
      </div>

      <div className="block sm:hidden p-2 bg-amber-50 border-t border-amber-200 text-center">
        <p className="text-xs text-amber-700">For the best experience, use a desktop browser.</p>
      </div>
    </div>
  );
}
