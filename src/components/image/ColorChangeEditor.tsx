'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Undo2, Redo2, RotateCcw, Loader2, X, Download, Wand2, Scissors,
  MousePointer2, Lasso, SlidersHorizontal, ChevronDown, ChevronUp,
  Pipette, Ban
} from 'lucide-react';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { ChangesHistory } from './color-change/ChangesHistory';
import { applyColorShift, restorePixels, getPixelColor, hexToRgb, rgbToHex, pointInPolygon } from '@/lib/color-utils';
import { useColorChangeHistory } from '@/hooks/useColorChangeHistory';
import { SelectionMode, SelectionMask, RGBColor } from '@/types/colorChange';

const ColorCanvas = dynamic(
  () => import('./color-change/ColorCanvas').then(m => ({ default: m.ColorCanvas })),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center bg-gray-900"><Loader2 className="w-8 h-8 animate-spin text-gray-600" /></div> }
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
  savedImageId: string | null;
  onNavigate: (path: string) => void;
}

export function ColorChangeEditor({
  image,
  usageRemaining,
  usageLimit,
  onSave,
  onCancel,
  savedImageId,
  onNavigate,
}: ColorChangeEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('click');
  const [tolerance, setTolerance] = useState(20);
  const [targetColor, setTargetColor] = useState('#2563eb');
  const [isSaving, setIsSaving] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);

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
      if (data[idx + 3] === 0) continue;

      const r = data[idx], g = data[idx + 1], b = data[idx + 2];

      if (excludedColors.length > 0) {
        let minTargetDist = Infinity;
        for (const sc of sampledColors) {
          const dist = Math.abs(r - sc.rgb.r) + Math.abs(g - sc.rgb.g) + Math.abs(b - sc.rgb.b);
          minTargetDist = Math.min(minTargetDist, dist);
        }
        let minExcludedDist = Infinity;
        for (const ec of excludedColors) {
          const dist = Math.abs(r - ec.rgb.r) + Math.abs(g - ec.rgb.g) + Math.abs(b - ec.rgb.b);
          minExcludedDist = Math.min(minExcludedDist, dist);
        }
        if (minExcludedDist <= minTargetDist) continue;
      }

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

      if (lassoRegions.length > 0) {
        const px = i % width;
        const py = Math.floor(i / width);

        const includeRegions = lassoRegions.filter(r => r.mode === 'include');
        const excludeRegions = lassoRegions.filter(r => r.mode === 'exclude');

        if (includeRegions.length > 0) {
          const inAnyInclude = includeRegions.some(r => pointInPolygon(px, py, r.polygon));
          if (!inAnyInclude) continue;
        }

        const inAnyExclude = excludeRegions.some(r => pointInPolygon(px, py, r.polygon));
        if (inAnyExclude) continue;
      }

      mask[i] = 1;
      const px = i % width;
      const py = Math.floor(i / width);
      minX = Math.min(minX, px); minY = Math.min(minY, py);
      maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
    }

    if (maxX < minX) return null;
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
      setSampledColors(prev => {
        if (prev.some(c => c.hex === hex)) return prev;
        return [...prev, { rgb: color, hex }];
      });
      setExcludedColors(prev => prev.filter(c => c.hex !== hex));
    } else if (mode === 'subtract') {
      setExcludedColors(prev => {
        if (prev.some(c => c.hex === hex)) return prev;
        return [...prev, { rgb: color, hex }];
      });
      setSampledColors(prev => prev.filter(c => c.hex !== hex));
    }
  }, []);

  const handleLassoComplete = useCallback((polygon: Array<{ x: number; y: number }>, mode: 'trim' | 'add' | 'subtract') => {
    if (sampledColors.length === 0) return;

    if (mode === 'add') {
      setLassoRegions(prev => [...prev, { polygon, mode: 'include' }]);
    } else if (mode === 'subtract') {
      setLassoRegions(prev => [...prev, { polygon, mode: 'exclude' }]);
    } else {
      setLassoRegions([{ polygon, mode: 'include' }]);
    }
  }, [sampledColors]);

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

  const handleDownload = useCallback(async () => {
    if (!canvasRef.current) return;
    if (!savedImageId && history.changeCount > 0) {
      setIsSaving(true);
      try {
        await onSave(canvasRef.current);
      } finally {
        setIsSaving(false);
      }
    }
    const link = document.createElement('a');
    link.download = 'color-changed.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  }, [canvasRef, savedImageId, history.changeCount, onSave]);

  if (!imageData) {
    return <div className="flex-1 flex items-center justify-center bg-gray-900"><Loader2 className="w-8 h-8 animate-spin text-gray-600" /></div>;
  }

  const hasSelection = currentMask !== null;
  const hasChanges = history.changeCount > 0;

  return (
    <div className="flex flex-col flex-1 bg-gray-950">
      {/* Toolbar */}
      <div className="bg-gray-900 border-b border-gray-800 px-3 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode toggle */}
          <div className="flex bg-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setSelectionMode('click')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                selectionMode === 'click'
                  ? 'bg-amber-500 text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <MousePointer2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Select</span>
            </button>
            <button
              onClick={() => setSelectionMode('lasso')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                selectionMode === 'lasso'
                  ? 'bg-amber-500 text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Lasso className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lasso</span>
            </button>
          </div>

          <div className="h-5 w-px bg-gray-700" />

          {/* Tolerance */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500" />
            <input
              type="range"
              min={0}
              max={100}
              value={tolerance}
              onChange={e => setTolerance(Number(e.target.value))}
              className="w-20 sm:w-28 h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
            />
            <span className="text-xs font-mono text-gray-400 w-5 text-right">{tolerance}</span>
          </div>

          <div className="h-5 w-px bg-gray-700" />

          {/* Undo/Redo */}
          <div className="flex gap-0.5">
            <button onClick={handleUndo} disabled={!history.canUndo} className="p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-800 disabled:opacity-20 disabled:hover:bg-transparent transition-colors" title="Undo (Ctrl+Z)">
              <Undo2 className="w-4 h-4" />
            </button>
            <button onClick={handleRedo} disabled={!history.canRedo} className="p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-800 disabled:opacity-20 disabled:hover:bg-transparent transition-colors" title="Redo (Ctrl+Shift+Z)">
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1" />

          {/* Reset */}
          <button onClick={handleResetAll} disabled={!hasChanges} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800 disabled:opacity-20 transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Mobile panel toggle */}
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="md:hidden p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-800"
          >
            {panelOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        {/* Canvas */}
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

        {/* Side panel */}
        <div className={`${panelOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[300px] bg-gray-900 border-t md:border-t-0 md:border-l border-gray-800 overflow-y-auto`}>
          <div className="p-4 space-y-5 flex-1">
            {/* Selected colors */}
            <div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <Pipette className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Target Colors</span>
                {sampledColors.length > 0 && (
                  <span className="text-xs text-gray-600 ml-auto">{sampledColors.length}</span>
                )}
              </div>
              {sampledColors.length === 0 ? (
                <div className="text-xs text-gray-500 p-3 bg-gray-800/50 rounded-lg border border-gray-800 border-dashed">
                  Click on the image to pick a color
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {sampledColors.map((sc) => (
                    <div
                      key={sc.hex}
                      className="flex items-center gap-1.5 pl-1 pr-1 py-0.5 bg-gray-800 rounded-md group hover:bg-gray-750 transition-colors"
                    >
                      <div
                        className="w-5 h-5 rounded shadow-inner border border-white/10"
                        style={{ backgroundColor: sc.hex }}
                      />
                      <span className="text-[10px] text-gray-400 font-mono">{sc.hex.toUpperCase()}</span>
                      <button
                        onClick={() => setSampledColors(prev => prev.filter(c => c.hex !== sc.hex))}
                        className="p-0.5 text-gray-600 hover:text-red-400 transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Excluded colors */}
            {excludedColors.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Ban className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-xs font-semibold text-red-400/80 uppercase tracking-wider">Excluded</span>
                  <span className="text-xs text-gray-600 ml-auto">{excludedColors.length}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {excludedColors.map((ec) => (
                    <div
                      key={ec.hex}
                      className="flex items-center gap-1.5 pl-1 pr-1 py-0.5 bg-red-950/30 border border-red-900/30 rounded-md group"
                    >
                      <div className="w-5 h-5 rounded relative overflow-hidden border border-red-500/30" style={{ backgroundColor: ec.hex }}>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-[140%] h-0.5 bg-red-500/80 rotate-45" />
                        </div>
                      </div>
                      <span className="text-[10px] text-red-400/70 font-mono">{ec.hex.toUpperCase()}</span>
                      <button
                        onClick={() => setExcludedColors(prev => prev.filter(c => c.hex !== ec.hex))}
                        className="p-0.5 text-red-800 hover:text-red-400 transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lasso regions indicator */}
            {lassoRegions.length > 0 && (
              <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-800/50 px-3 py-2 rounded-lg">
                <span>{lassoRegions.filter(r => r.mode === 'include').length} include, {lassoRegions.filter(r => r.mode === 'exclude').length} exclude regions</span>
                <button onClick={() => setLassoRegions([])} className="text-red-400/60 hover:text-red-400">Clear</button>
              </div>
            )}

            {/* Replace with color */}
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Replace With</div>
              <div className="space-y-3">
                <div className="rounded-lg overflow-hidden">
                  <HexColorPicker
                    color={targetColor}
                    onChange={setTargetColor}
                    style={{ width: '100%', height: '160px' }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-9 h-9 rounded-lg shadow-inner border border-white/10 flex-shrink-0"
                    style={{ backgroundColor: targetColor }}
                  />
                  <div className="flex-1 flex items-center bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                    <span className="text-gray-500 text-sm mr-1">#</span>
                    <HexColorInput
                      color={targetColor}
                      onChange={setTargetColor}
                      className="w-full text-sm text-gray-200 font-mono bg-transparent outline-none"
                      prefixed={false}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Apply */}
            <button
              onClick={handleApply}
              disabled={!hasSelection || !sourceColor}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-800 disabled:text-gray-600 text-gray-900 font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 disabled:shadow-none"
            >
              Apply Color Change
            </button>

            {/* Keyboard hints */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-gray-600 p-2.5 bg-gray-800/30 rounded-lg">
              <span><kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400 font-mono">Click</kbd> Select</span>
              <span><kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400 font-mono">Shift</kbd> Add</span>
              <span><kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400 font-mono">Alt</kbd> Exclude</span>
              <span><kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400 font-mono">Lasso</kbd> Refine</span>
            </div>

            {/* Changes history */}
            {hasChanges && (
              <ChangesHistory
                changes={history.changes}
                onRemoveChange={handleRemoveChange}
              />
            )}
          </div>

          {/* Actions footer */}
          <div className="p-3 border-t border-gray-800 space-y-2 bg-gray-900/80 backdrop-blur">
            <div className="text-[10px] text-gray-600 text-center">
              {usageRemaining > 0
                ? `${usageLimit - usageRemaining}/${usageLimit} free changes used`
                : 'Over limit — 1 credit per save'}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={onCancel} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-400 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                className="px-3 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-medium rounded-lg text-xs transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleDownload}
                disabled={isSaving || !hasChanges}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded-lg text-xs text-gray-300 transition-colors flex items-center justify-center gap-1"
              >
                <Download className="w-3 h-3" /> Download
              </button>
              {savedImageId ? (
                <div className="flex gap-1">
                  <button
                    onClick={() => onNavigate(`/process/upscale?imageId=${savedImageId}`)}
                    className="flex-1 px-2 py-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg text-xs text-purple-300 transition-colors flex items-center justify-center gap-1"
                  >
                    <Wand2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onNavigate(`/process/background-removal?imageId=${savedImageId}`)}
                    className="flex-1 px-2 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 rounded-lg text-xs text-emerald-300 transition-colors flex items-center justify-center gap-1"
                  >
                    <Scissors className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="px-3 py-2 bg-gray-800/50 rounded-lg text-[10px] text-gray-600 text-center">
                  Save to unlock more
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
