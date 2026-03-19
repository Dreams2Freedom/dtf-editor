'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Undo2, Redo2, RotateCcw, Loader2, X } from 'lucide-react';
import { ColorPicker } from './color-change/ColorPicker';
import { ChangesHistory } from './color-change/ChangesHistory';
import { applyColorShift, restorePixels, getPixelColor, hexToRgb, rgbToHex, pointInPolygon } from '@/lib/color-utils';
import { useColorChangeHistory } from '@/hooks/useColorChangeHistory';
import { SelectionMode, SelectionMask, RGBColor } from '@/types/colorChange';

const ColorCanvas = dynamic(
  () => import('./color-change/ColorCanvas').then(m => ({ default: m.ColorCanvas })),
  { ssr: false, loading: () => <div className="flex-1 min-h-[300px] flex items-center justify-center bg-gray-100"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div> }
);

interface SampledColor {
  rgb: RGBColor;
  hex: string;
}

interface LassoRegion {
  polygon: Array<{ x: number; y: number }>;
  mode: 'include' | 'exclude';
}

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
  const [targetColor, setTargetColor] = useState('#2563eb');
  const [isSaving, setIsSaving] = useState(false);
  const [renderKey, setRenderKey] = useState(0);

  // Color-set model: store sampled colors + lasso regions, derive mask
  const [sampledColors, setSampledColors] = useState<SampledColor[]>([]);
  const [excludedColors, setExcludedColors] = useState<SampledColor[]>([]);
  const [lassoRegions, setLassoRegions] = useState<LassoRegion[]>([]);

  const history = useColorChangeHistory();

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute mask from sampled colors + tolerance + lasso regions
  // Re-runs whenever any of these change (including tolerance slider!)
  const currentMask = useMemo((): SelectionMask | null => {
    if (sampledColors.length === 0) return null;
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    const fresh = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = fresh;

    const mask = new Uint8Array(width * height);
    let minX = width, minY = height, maxX = 0, maxY = 0;

    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      if (data[idx + 3] === 0) continue; // skip transparent

      const r = data[idx], g = data[idx + 1], b = data[idx + 2];

      // Check if pixel is closer to an excluded color than any target color
      // This prevents selecting dark greens that are too close to black, etc.
      if (excludedColors.length > 0) {
        // Distance to closest target color
        let minTargetDist = Infinity;
        for (const sc of sampledColors) {
          const dist = Math.abs(r - sc.rgb.r) + Math.abs(g - sc.rgb.g) + Math.abs(b - sc.rgb.b);
          minTargetDist = Math.min(minTargetDist, dist);
        }
        // Distance to closest excluded color
        let minExcludedDist = Infinity;
        for (const ec of excludedColors) {
          const dist = Math.abs(r - ec.rgb.r) + Math.abs(g - ec.rgb.g) + Math.abs(b - ec.rgb.b);
          minExcludedDist = Math.min(minExcludedDist, dist);
        }
        // Skip if closer to excluded than target
        if (minExcludedDist <= minTargetDist) continue;
      }

      // Check if this pixel matches ANY sampled color within tolerance
      let matches = false;
      for (const sc of sampledColors) {
        if (
          Math.abs(r - sc.rgb.r) <= tolerance &&
          Math.abs(g - sc.rgb.g) <= tolerance &&
          Math.abs(b - sc.rgb.b) <= tolerance
        ) {
          matches = true;
          break;
        }
      }

      if (!matches) continue;

      // Apply lasso regions (if any)
      if (lassoRegions.length > 0) {
        const px = i % width;
        const py = Math.floor(i / width);

        // Check include regions: pixel must be inside at least one include region
        const includeRegions = lassoRegions.filter(r => r.mode === 'include');
        const excludeRegions = lassoRegions.filter(r => r.mode === 'exclude');

        if (includeRegions.length > 0) {
          const inAnyInclude = includeRegions.some(r => pointInPolygon(px, py, r.polygon));
          if (!inAnyInclude) continue;
        }

        // Check exclude regions: pixel must NOT be in any exclude region
        const inAnyExclude = excludeRegions.some(r => pointInPolygon(px, py, r.polygon));
        if (inAnyExclude) continue;
      }

      mask[i] = 1;
      const px = i % width;
      const py = Math.floor(i / width);
      minX = Math.min(minX, px); minY = Math.min(minY, py);
      maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
    }

    if (maxX < minX) return null; // empty selection
    return { data: mask, width, height, bounds: { minX, minY, maxX, maxY } };
  }, [sampledColors, excludedColors, tolerance, lassoRegions]);

  const refreshImageData = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    setImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
    setRenderKey(prev => prev + 1);
  }, []);

  // The "source color" for HSL shift = average of sampled colors (first one is primary)
  const sourceColor = sampledColors.length > 0 ? sampledColors[0].rgb : null;

  const handlePixelClick = useCallback((x: number, y: number, mode: 'replace' | 'add' | 'subtract') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const fresh = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const color = getPixelColor(fresh, x, y);
    const hex = rgbToHex(color);

    if (mode === 'replace') {
      setSampledColors([{ rgb: color, hex }]);
      setExcludedColors([]);
      setLassoRegions([]);
    } else if (mode === 'add') {
      // Don't add duplicate colors
      setSampledColors(prev => {
        if (prev.some(c => c.hex === hex)) return prev;
        return [...prev, { rgb: color, hex }];
      });
      // Remove from excluded if it was there
      setExcludedColors(prev => prev.filter(c => c.hex !== hex));
    } else if (mode === 'subtract') {
      // Alt+Click: add to excluded colors list (NOT remove from target)
      setExcludedColors(prev => {
        if (prev.some(c => c.hex === hex)) return prev;
        return [...prev, { rgb: color, hex }];
      });
      // Remove from sampled if it was there
      setSampledColors(prev => prev.filter(c => c.hex !== hex));
    }
  }, []);

  const handleLassoComplete = useCallback((polygon: Array<{ x: number; y: number }>, mode: 'trim' | 'add' | 'subtract') => {
    if (sampledColors.length === 0) {
      // No colors selected yet — not useful without colors
      return;
    }

    if (mode === 'add') {
      // Shift+Lasso: add an include region
      setLassoRegions(prev => [...prev, { polygon, mode: 'include' }]);
    } else if (mode === 'subtract') {
      // Alt+Lasso: add an exclude region
      setLassoRegions(prev => [...prev, { polygon, mode: 'exclude' }]);
    } else {
      // Plain lasso: replace all regions with just this include region
      setLassoRegions([{ polygon, mode: 'include' }]);
    }
  }, [sampledColors]);

  const handleRemoveSampledColor = useCallback((hex: string) => {
    setSampledColors(prev => prev.filter(c => c.hex !== hex));
  }, []);

  const handleApply = useCallback(() => {
    if (!currentMask || !sourceColor || !canvasRef.current) return;
    const target = hexToRgb(targetColor);

    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
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

    // Clear selection state for next operation
    setSampledColors([]);
    setExcludedColors([]);
    setLassoRegions([]);
    refreshImageData();
  }, [currentMask, sourceColor, targetColor, history, refreshImageData]);

  const handleUndo = useCallback(() => {
    const entry = history.undo();
    if (!entry || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    restorePixels(imgData, entry.mask, entry.originalPixels);
    ctx.putImageData(imgData, 0, 0);
    refreshImageData();
  }, [history, refreshImageData]);

  const handleRedo = useCallback(() => {
    const entry = history.redo();
    if (!entry || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    applyColorShift(imgData, entry.mask, entry.sourceColor, entry.targetColor);
    ctx.putImageData(imgData, 0, 0);
    refreshImageData();
  }, [history, refreshImageData]);

  const handleResetAll = useCallback(() => {
    const entries = history.resetAll();
    if (!canvasRef.current || entries.length === 0) return;
    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(image, 0, 0);
    setSampledColors([]);
    setExcludedColors([]);
    setLassoRegions([]);
    refreshImageData();
  }, [history, image, refreshImageData]);

  const handleRemoveChange = useCallback((id: string) => {
    const removed = history.removeEntry(id);
    if (!removed || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
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
      {/* Top toolbar */}
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

      {/* Main content */}
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

        {/* Right panel */}
        <div className="w-full md:w-[280px] bg-white border-t md:border-t-0 md:border-l border-gray-200 p-4 overflow-y-auto space-y-4">
          {/* Sampled colors */}
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">
              Selected Colors ({sampledColors.length})
            </div>
            {sampledColors.length === 0 ? (
              <p className="text-sm text-gray-400 p-3 bg-gray-50 rounded-lg border border-gray-200">
                Click on the image to select a color
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {sampledColors.map((sc) => (
                  <div
                    key={sc.hex}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded-md group"
                  >
                    <div
                      className="w-5 h-5 rounded border border-gray-300"
                      style={{ backgroundColor: sc.hex }}
                    />
                    <span className="text-xs text-gray-600 font-mono">{sc.hex.toUpperCase()}</span>
                    <button
                      onClick={() => handleRemoveSampledColor(sc.hex)}
                      className="p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove this color"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {lassoRegions.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {lassoRegions.filter(r => r.mode === 'include').length} include, {lassoRegions.filter(r => r.mode === 'exclude').length} exclude regions
                </span>
                <button
                  onClick={() => setLassoRegions([])}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Clear regions
                </button>
              </div>
            )}
          </div>

          {/* Excluded colors */}
          {excludedColors.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wider text-red-400 font-semibold mb-2">
                Excluded Colors ({excludedColors.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {excludedColors.map((ec) => (
                  <div
                    key={ec.hex}
                    className="flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded-md group"
                  >
                    <div
                      className="w-5 h-5 rounded border border-red-300 relative"
                      style={{ backgroundColor: ec.hex }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-0.5 bg-red-500 rotate-45" />
                      </div>
                    </div>
                    <span className="text-xs text-red-600 font-mono">{ec.hex.toUpperCase()}</span>
                    <button
                      onClick={() => setExcludedColors(prev => prev.filter(c => c.hex !== ec.hex))}
                      className="p-0.5 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove exclusion"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
            <p className="font-semibold text-gray-500 mb-1">Click Select:</p>
            <p><strong>Click</strong> — select a color</p>
            <p><strong>Shift+Click</strong> — add shade</p>
            <p><strong>Alt+Click</strong> — exclude color</p>
            <p className="font-semibold text-gray-500 mt-2 mb-1">Lasso:</p>
            <p><strong>Draw</strong> — limit to area</p>
            <p><strong>Shift+Draw</strong> — add area</p>
            <p><strong>Alt+Draw</strong> — exclude area</p>
            <p className="font-semibold text-gray-500 mt-2 mb-1">Tolerance:</p>
            <p>Slider updates selection live</p>
          </div>

          <ChangesHistory
            changes={history.changes}
            onRemoveChange={handleRemoveChange}
          />
        </div>
      </div>

      {/* Bottom bar */}
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
