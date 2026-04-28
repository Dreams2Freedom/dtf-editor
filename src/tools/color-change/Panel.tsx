'use client';

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import dynamic from 'next/dynamic';
import {
  Undo2,
  Redo2,
  RotateCcw,
  Loader2,
  X,
  Download,
  Wand2,
  Scissors,
  MousePointer2,
  Lasso,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Pipette,
  Ban,
  HelpCircle,
  Hand,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { ChangesHistory } from './components/ChangesHistory';
import {
  applyColorShift,
  restorePixels,
  getPixelColor,
  hexToRgb,
  rgbToHex,
  pointInPolygon,
} from './color-utils';
import { useColorChangeHistory } from './useColorChangeHistory';
import { SelectionMode, SelectionMask, RGBColor } from './types';

const ColorCanvas = dynamic(
  () =>
    import('./components/ColorCanvas').then(m => ({ default: m.ColorCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    ),
  }
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
  const canvasControlsRef = useRef({
    fitToView: () => {},
    zoomIn: () => {},
    zoomOut: () => {},
  });
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('click');
  const [tolerance, setTolerance] = useState(20);
  const [targetColor, setTargetColor] = useState('#2563eb');
  const [isSaving, setIsSaving] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  // Auto-show help on first visit
  useEffect(() => {
    const seen = localStorage.getItem('help_color_changer');
    if (!seen) {
      setShowHelp(true);
    }
  }, []);

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
    let minX = width,
      minY = height,
      maxX = 0,
      maxY = 0;

    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      if (data[idx + 3] === 0) continue;

      const r = data[idx],
        g = data[idx + 1],
        b = data[idx + 2];

      if (excludedColors.length > 0) {
        let minTargetDist = Infinity;
        for (const sc of sampledColors) {
          const dist =
            Math.abs(r - sc.rgb.r) +
            Math.abs(g - sc.rgb.g) +
            Math.abs(b - sc.rgb.b);
          minTargetDist = Math.min(minTargetDist, dist);
        }
        let minExcludedDist = Infinity;
        for (const ec of excludedColors) {
          const dist =
            Math.abs(r - ec.rgb.r) +
            Math.abs(g - ec.rgb.g) +
            Math.abs(b - ec.rgb.b);
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
          const inAnyInclude = includeRegions.some(r =>
            pointInPolygon(px, py, r.polygon)
          );
          if (!inAnyInclude) continue;
        }

        const inAnyExclude = excludeRegions.some(r =>
          pointInPolygon(px, py, r.polygon)
        );
        if (inAnyExclude) continue;
      }

      mask[i] = 1;
      const px = i % width;
      const py = Math.floor(i / width);
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
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

  const handlePixelClick = useCallback(
    (x: number, y: number, mode: 'replace' | 'add' | 'subtract') => {
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
    },
    []
  );

  const handleLassoComplete = useCallback(
    (
      polygon: Array<{ x: number; y: number }>,
      mode: 'trim' | 'add' | 'subtract'
    ) => {
      if (sampledColors.length === 0) return;

      if (mode === 'add') {
        setLassoRegions(prev => [...prev, { polygon, mode: 'include' }]);
      } else if (mode === 'subtract') {
        setLassoRegions(prev => [...prev, { polygon, mode: 'exclude' }]);
      } else {
        setLassoRegions([{ polygon, mode: 'include' }]);
      }
    },
    [sampledColors]
  );

  const handleApply = useCallback(() => {
    if (!currentMask || !sourceColor || !canvasRef.current) return;
    const target = hexToRgb(targetColor);

    const ctx = canvasRef.current.getContext('2d', {
      willReadFrequently: true,
    });
    if (!ctx) return;
    const freshImageData = ctx.getImageData(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    const originalPixels = applyColorShift(
      freshImageData,
      currentMask,
      sourceColor,
      target
    );
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

    // Phase 2.2: Apply now also pushes to Studio's working image so the
    // global Save to Gallery commits the result. The old per-tool Save
    // button has been removed.
    onSave(canvasRef.current).catch(err => {
      console.error('[ColorChange] onSave failed:', err);
    });
  }, [
    currentMask,
    sourceColor,
    targetColor,
    history,
    refreshImageData,
    onSave,
  ]);

  const handleUndo = useCallback(() => {
    const entry = history.undo();
    if (!entry || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d', {
      willReadFrequently: true,
    });
    if (!ctx) return;
    const imgData = ctx.getImageData(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );
    restorePixels(imgData, entry.mask, entry.originalPixels);
    ctx.putImageData(imgData, 0, 0);
    refreshImageData();
  }, [history, refreshImageData]);

  const handleRedo = useCallback(() => {
    const entry = history.redo();
    if (!entry || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d', {
      willReadFrequently: true,
    });
    if (!ctx) return;
    const imgData = ctx.getImageData(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );
    applyColorShift(imgData, entry.mask, entry.sourceColor, entry.targetColor);
    ctx.putImageData(imgData, 0, 0);
    refreshImageData();
  }, [history, refreshImageData]);

  const handleResetAll = useCallback(() => {
    const entries = history.resetAll();
    if (!canvasRef.current || entries.length === 0) return;
    const ctx = canvasRef.current.getContext('2d', {
      willReadFrequently: true,
    });
    if (!ctx) return;
    ctx.drawImage(image, 0, 0);
    setSampledColors([]);
    setExcludedColors([]);
    setLassoRegions([]);
    refreshImageData();
  }, [history, image, refreshImageData]);

  const handleRemoveChange = useCallback(
    (id: string) => {
      const removed = history.removeEntry(id);
      if (!removed || !canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d', {
        willReadFrequently: true,
      });
      if (!ctx) return;
      ctx.drawImage(image, 0, 0);
      for (const entry of history.changes) {
        const imgData = ctx.getImageData(
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );
        applyColorShift(
          imgData,
          entry.mask,
          entry.sourceColor,
          entry.targetColor
        );
        ctx.putImageData(imgData, 0, 0);
      }
      refreshImageData();
    },
    [history, image, refreshImageData]
  );

  const closeHelp = () => {
    setShowHelp(false);
    localStorage.setItem('help_color_changer', 'true');
  };

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
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const hasSelection = currentMask !== null;
  const hasChanges = history.changeCount > 0;

  return (
    <div className="flex flex-col flex-1 bg-gray-50">
      {/* Phase 2.2: wide top toolbar removed.
          - Select / Lasso / Pan and zoom controls are now floating pills
            over the canvas (matching BG Removal's pattern).
          - Tolerance, Undo, Redo, Reset, Help moved into the right
            sidebar.
          - Per-tool Save / Download / Cancel footer dropped — Studio's
            global Save to Gallery in the header is the only commit. */}

      {/* Main area */}
      <div className="flex flex-1 min-h-0 flex-col md:flex-row overflow-hidden">
        {/* Canvas with floating Studio chrome */}
        <div className="relative flex flex-1 min-h-0">
          <ColorCanvas
            key={renderKey}
            image={image}
            editCanvas={canvasRef.current}
            imageData={imageData}
            selectionMode={selectionMode}
            currentMask={currentMask}
            onPixelClick={handlePixelClick}
            onLassoComplete={handleLassoComplete}
            controlsRef={canvasControlsRef}
          />

          {/* Select / Lasso / Pan pill — top-left, mirrors BG Removal */}
          <div className="absolute top-2 left-2 z-10 flex rounded-full bg-white/90 backdrop-blur-sm shadow border border-gray-200 overflow-hidden text-xs font-medium">
            <button
              type="button"
              onClick={() => setSelectionMode('click')}
              className={`flex items-center gap-1 px-3 py-1 transition-colors ${
                selectionMode === 'click'
                  ? 'bg-amber-500 text-gray-900'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              title="Click to pick a color"
            >
              <MousePointer2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Select</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectionMode('lasso')}
              className={`flex items-center gap-1 px-3 py-1 transition-colors ${
                selectionMode === 'lasso'
                  ? 'bg-amber-500 text-gray-900'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              title="Lasso a region"
            >
              <Lasso className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lasso</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectionMode('pan')}
              className={`flex items-center gap-1 px-3 py-1 transition-colors ${
                selectionMode === 'pan'
                  ? 'bg-amber-500 text-gray-900'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              title="Pan the canvas"
            >
              <Hand className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pan</span>
            </button>
          </div>

          {/* Zoom pill — top-right */}
          <div className="absolute top-2 right-2 z-10 flex items-center rounded-full bg-white/90 backdrop-blur-sm shadow border border-gray-200 overflow-hidden text-xs font-medium">
            <button
              type="button"
              onClick={() => canvasControlsRef.current.zoomOut()}
              className="px-2.5 py-1 text-gray-700 hover:bg-gray-50"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => canvasControlsRef.current.zoomIn()}
              className="px-2.5 py-1 text-gray-700 hover:bg-gray-50"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => canvasControlsRef.current.fitToView()}
              className="flex items-center gap-1 px-2 py-1 text-gray-700 hover:bg-gray-50 border-l border-gray-200"
              title="Fit image to view"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Fit
            </button>
          </div>
        </div>

        {/* Side panel — fixed width, never shrinks, scrollable content + fixed footer */}
        <div
          className={`${panelOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[300px] md:flex-shrink-0 bg-white border-t md:border-t-0 md:border-l border-gray-200`}
        >
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
            {/* Phase 2.2: tolerance + undo/redo + reset relocated from
                the removed wide toolbar into the sidebar so the canvas
                stays uncluttered. */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tolerance
                  </label>
                  <span className="text-xs font-mono text-gray-500 tabular-nums">
                    {tolerance}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={tolerance}
                  onChange={e => setTolerance(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
                />
              </div>

              <div className="flex gap-1">
                <button
                  onClick={handleUndo}
                  disabled={!history.canUndo}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  Undo
                </button>
                <button
                  onClick={handleRedo}
                  disabled={!history.canRedo}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Redo (Ctrl+Shift+Z)"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                  Redo
                </button>
                <button
                  onClick={handleResetAll}
                  disabled={!hasChanges}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Reset all changes"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>
            </div>

            {/* Selected colors */}
            <div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <Pipette className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Target Colors
                </span>
                {sampledColors.length > 0 && (
                  <span className="text-xs text-gray-400 ml-auto">
                    {sampledColors.length}
                  </span>
                )}
              </div>
              {sampledColors.length === 0 ? (
                <div className="text-xs text-gray-500 p-3 bg-gray-100 rounded-lg border border-gray-200 border-dashed">
                  Click on the image to pick a color
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {sampledColors.map(sc => (
                    <div
                      key={sc.hex}
                      className="flex items-center gap-1.5 pl-1 pr-1 py-0.5 bg-gray-100 rounded-md group hover:bg-gray-200 transition-colors"
                    >
                      <div
                        className="w-5 h-5 rounded shadow-inner border border-gray-300"
                        style={{ backgroundColor: sc.hex }}
                      />
                      <span className="text-[10px] text-gray-500 font-mono">
                        {sc.hex.toUpperCase()}
                      </span>
                      <button
                        onClick={() =>
                          setSampledColors(prev =>
                            prev.filter(c => c.hex !== sc.hex)
                          )
                        }
                        className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
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
                  <Ban className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">
                    Excluded
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {excludedColors.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {excludedColors.map(ec => (
                    <div
                      key={ec.hex}
                      className="flex items-center gap-1.5 pl-1 pr-1 py-0.5 bg-red-50 border border-red-200 rounded-md group"
                    >
                      <div
                        className="w-5 h-5 rounded relative overflow-hidden border border-red-300"
                        style={{ backgroundColor: ec.hex }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-[140%] h-0.5 bg-red-500 rotate-45" />
                        </div>
                      </div>
                      <span className="text-[10px] text-red-500 font-mono">
                        {ec.hex.toUpperCase()}
                      </span>
                      <button
                        onClick={() =>
                          setExcludedColors(prev =>
                            prev.filter(c => c.hex !== ec.hex)
                          )
                        }
                        className="p-0.5 text-red-500 hover:text-red-500 transition-colors"
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
              <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
                <span>
                  {lassoRegions.filter(r => r.mode === 'include').length}{' '}
                  include,{' '}
                  {lassoRegions.filter(r => r.mode === 'exclude').length}{' '}
                  exclude regions
                </span>
                <button
                  onClick={() => setLassoRegions([])}
                  className="text-red-500 hover:text-red-500"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Replace with color */}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                Replace With
              </div>
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
                    className="w-9 h-9 rounded-lg shadow-inner border border-gray-300 flex-shrink-0"
                    style={{ backgroundColor: targetColor }}
                  />
                  <div className="flex-1 flex items-center bg-gray-100 border border-gray-200 rounded-lg px-3 py-2">
                    <span className="text-gray-500 text-sm mr-1">#</span>
                    <HexColorInput
                      color={targetColor}
                      onChange={setTargetColor}
                      className="w-full text-sm text-gray-900 font-mono bg-transparent outline-none"
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
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-200 disabled:text-gray-400 text-gray-900 font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 disabled:shadow-none"
            >
              Apply Color Change
            </button>

            {/* Keyboard hints */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-gray-400 p-2.5 bg-gray-50 rounded-lg">
              <span>
                <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">
                  Click
                </kbd>{' '}
                Select
              </span>
              <span>
                <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">
                  Shift
                </kbd>{' '}
                Add
              </span>
              <span>
                <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">
                  Alt
                </kbd>{' '}
                Exclude
              </span>
              <span>
                <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">
                  Lasso
                </kbd>{' '}
                Refine
              </span>
              <span>
                <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">
                  Space
                </kbd>{' '}
                Pan
              </span>
              <span>
                <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">
                  +/−
                </kbd>{' '}
                Zoom
              </span>
            </div>

            {/* Changes history */}
            {hasChanges && (
              <ChangesHistory
                changes={history.changes}
                onRemoveChange={handleRemoveChange}
              />
            )}
          </div>

          {/* Phase 2.2: per-tool Save / Download / Cancel footer removed.
              Studio's global Save to Gallery in the header now handles
              committing the working image. The free-changes counter
              still surfaces here so users see their remaining quota. */}
          <div className="flex-shrink-0 px-3 py-2 border-t border-gray-200 bg-white">
            <p className="text-[10px] text-gray-400 text-center">
              {usageRemaining > 0
                ? `${usageLimit - usageRemaining}/${usageLimit} free changes used — Save to Gallery in the header to commit.`
                : 'Over limit — saving will use 1 credit.'}
            </p>
          </div>
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeHelp}
        >
          <div
            className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-600" />
                <h2 className="text-lg font-bold text-gray-900">
                  How to Use Color Changer
                </h2>
              </div>
              <button
                onClick={closeHelp}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6 text-sm text-gray-700">
              {/* Step 1 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-amber-500 text-gray-900 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    1
                  </span>
                  <h3 className="font-semibold text-gray-900">
                    Select the colors you want to change
                  </h3>
                </div>
                <div className="ml-8 space-y-2 text-gray-500">
                  <p>
                    <strong className="text-gray-700">Click</strong> on any
                    color in the image to select it. All matching pixels across
                    the image will highlight in blue.
                  </p>
                  <p>
                    <strong className="text-gray-700">Shift+Click</strong> to
                    add more shades. For example, click a light green, then
                    Shift+Click a darker green to select both shades.
                  </p>
                  <p>
                    <strong className="text-gray-700">Alt+Click</strong> to
                    exclude a color. If the selection catches some black or
                    brown pixels you don&apos;t want, Alt+Click them to add to
                    the exclusion list. Pixels closer to excluded colors will be
                    automatically removed from the selection.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-amber-500 text-gray-900 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    2
                  </span>
                  <h3 className="font-semibold text-gray-900">
                    Refine with Tolerance and Lasso
                  </h3>
                </div>
                <div className="ml-8 space-y-2 text-gray-500">
                  <p>
                    <strong className="text-gray-700">Tolerance slider</strong>{' '}
                    controls how much color variation is included. Drag it to
                    see the selection update in real-time. Higher = more
                    variation, lower = exact match only.
                  </p>
                  <p>
                    <strong className="text-gray-700">Lasso tool</strong> lets
                    you define areas. Switch to Lasso mode and draw around a
                    specific region:
                  </p>
                  <ul className="list-disc ml-4 space-y-1">
                    <li>
                      <strong className="text-gray-700">Draw</strong> — limit
                      the selection to inside the lasso only
                    </li>
                    <li>
                      <strong className="text-gray-700">Shift+Draw</strong> —
                      add another area (e.g., lasso around a second rose)
                    </li>
                    <li>
                      <strong className="text-gray-700">Alt+Draw</strong> —
                      exclude an area from the selection
                    </li>
                  </ul>
                </div>
              </div>

              {/* Step 3 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-amber-500 text-gray-900 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    3
                  </span>
                  <h3 className="font-semibold text-gray-900">
                    Pick the replacement color
                  </h3>
                </div>
                <div className="ml-8 space-y-2 text-gray-500">
                  <p>
                    Use the{' '}
                    <strong className="text-gray-700">color wheel</strong> to
                    visually choose a new color, or type an exact{' '}
                    <strong className="text-gray-700">hex code</strong> in the
                    input field.
                  </p>
                  <p>
                    The color shift preserves shading and texture — dark areas
                    stay dark, light areas stay light. Only the hue and
                    saturation change.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-amber-500 text-gray-900 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    4
                  </span>
                  <h3 className="font-semibold text-gray-900">
                    Apply and repeat
                  </h3>
                </div>
                <div className="ml-8 space-y-2 text-gray-500">
                  <p>
                    Click{' '}
                    <strong className="text-gray-700">
                      Apply Color Change
                    </strong>{' '}
                    to commit the change. The selection clears and you can start
                    selecting a new color to change.
                  </p>
                  <p>
                    You can make multiple color changes on the same image. Each
                    change appears in the{' '}
                    <strong className="text-gray-700">History</strong> panel
                    where you can remove any individual change.
                  </p>
                  <p>
                    <strong className="text-gray-700">Undo/Redo</strong> with
                    the toolbar buttons or{' '}
                    <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-700 font-mono">
                      Ctrl+Z
                    </kbd>{' '}
                    /{' '}
                    <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-700 font-mono">
                      Ctrl+Shift+Z
                    </kbd>
                    .
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-amber-500 text-gray-900 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    5
                  </span>
                  <h3 className="font-semibold text-gray-900">
                    Save and export
                  </h3>
                </div>
                <div className="ml-8 space-y-2 text-gray-500">
                  <p>
                    <strong className="text-gray-700">Save to Gallery</strong>{' '}
                    stores the image in your account.
                  </p>
                  <p>
                    <strong className="text-gray-700">Download</strong> saves to
                    your computer (auto-saves to gallery first).
                  </p>
                  <p>
                    After saving, you can send the image directly to{' '}
                    <strong className="text-gray-700">Upscale</strong> or{' '}
                    <strong className="text-gray-700">
                      Background Removal
                    </strong>{' '}
                    for further processing.
                  </p>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="font-semibold text-amber-700 mb-2">Pro Tips</h3>
                <ul className="space-y-1.5 text-amber-700 text-xs">
                  <li>
                    Start with a low tolerance (10-20) and increase gradually to
                    avoid selecting too much.
                  </li>
                  <li>
                    Use excluded colors (Alt+Click) when similar colors bleed
                    into each other — like dark green near black.
                  </li>
                  <li>
                    The lasso Shift+Draw is perfect when the same color appears
                    in multiple separate areas (e.g., two roses).
                  </li>
                  <li>
                    For best print quality, make sure your image is at least
                    3000px wide (300 DPI at 10&quot;). Upscale first if needed.
                  </li>
                  <li>
                    Zoom in with the + button to see detail, then scroll to
                    navigate around the image.
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-3 rounded-b-2xl">
              <button
                onClick={closeHelp}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold rounded-xl text-sm transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
