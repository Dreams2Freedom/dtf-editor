'use client';

import React, { useRef, useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Line } from 'react-konva';
import Konva from 'konva';
import { Hand } from 'lucide-react';
import { SelectionMask, SelectionMode } from '@/types/colorChange';
import { createSelectionOverlay } from './SelectionTools';

interface ColorCanvasProps {
  image: HTMLImageElement;
  editCanvas: HTMLCanvasElement | null;
  imageData: ImageData;
  selectionMode: SelectionMode;
  currentMask: SelectionMask | null;
  onPixelClick: (x: number, y: number, mode: 'replace' | 'add' | 'subtract') => void;
  onLassoComplete: (polygon: Array<{ x: number; y: number }>, mode: 'trim' | 'add' | 'subtract') => void;
}

export function ColorCanvas({
  image,
  editCanvas,
  imageData,
  selectionMode,
  currentMask,
  onPixelClick,
  onLassoComplete,
}: ColorCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);

  // Canvas state
  const [overlayImage, setOverlayImage] = useState<HTMLCanvasElement | null>(null);
  const [lassoPoints, setLassoPoints] = useState<number[]>([]);
  const [isDrawingLasso, setIsDrawingLasso] = useState(false);
  const lassoModeRef = useRef<'trim' | 'add' | 'subtract'>('trim');

  // Zoom state
  const [scale, setScale] = useState(1);
  const [fitScale, setFitScale] = useState(1);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const scrollTargetRef = useRef<{ left: number; top: number } | null>(null);

  // Pan state
  const [isPanMode, setIsPanMode] = useState(false);
  const [isPanDragging, setIsPanDragging] = useState(false);
  const isSpaceDown = useRef(false);

  // Minimap state
  const [minimapViewport, setMinimapViewport] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const minimapDragging = useRef(false);

  // Minimap dimensions
  const MINIMAP_MAX = 140;
  const mRatio = Math.min(MINIMAP_MAX / image.width, MINIMAP_MAX / image.height);
  const mW = Math.round(image.width * mRatio);
  const mH = Math.round(image.height * mRatio);

  const isZoomed = scale > fitScale * 1.05;
  const scaledWidth = Math.max(image.width * scale, stageSize.width);
  const scaledHeight = Math.max(image.height * scale, stageSize.height);

  // ── Fit image on mount ──────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || !image) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight || 500;
    const fit = Math.min(cw / image.width, ch / image.height, 1);
    setScale(fit);
    setFitScale(fit);
    setStageSize({ width: cw, height: Math.max(image.height * fit, 300) });
  }, [image]);

  // ── Selection overlay ───────────────────────────────────
  useEffect(() => {
    if (!currentMask) { setOverlayImage(null); return; }
    const data = createSelectionOverlay(currentMask, imageData.width, imageData.height);
    const c = document.createElement('canvas');
    c.width = imageData.width;
    c.height = imageData.height;
    const ctx = c.getContext('2d');
    if (ctx) { ctx.putImageData(data, 0, 0); setOverlayImage(c); }
  }, [currentMask, imageData]);

  // ── Apply scroll target after scale change (before paint) ──
  useLayoutEffect(() => {
    if (scrollTargetRef.current && containerRef.current) {
      containerRef.current.scrollLeft = scrollTargetRef.current.left;
      containerRef.current.scrollTop = scrollTargetRef.current.top;
      scrollTargetRef.current = null;
    }
  }, [scale]);

  // ── Zoom handler (for buttons) ──────────────────────────
  const handleZoom = useCallback((direction: 'in' | 'out' | 'fit') => {
    if (direction === 'fit') {
      if (!containerRef.current) return;
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight || 500;
      const fit = Math.min(cw / image.width, ch / image.height, 1);
      setScale(fit);
      setFitScale(fit);
    } else {
      setScale(prev => {
        const factor = direction === 'in' ? 1.25 : 0.8;
        return Math.max(0.1, Math.min(5, prev * factor));
      });
    }
  }, [image]);

  // ── Keyboard shortcuts (Space pan, +/- zoom, 0 fit) ────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        isSpaceDown.current = true;
        setIsPanMode(true);
      }
      if ((e.key === '=' || e.key === '+') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setScale(prev => Math.max(0.1, Math.min(5, prev * 1.25)));
      }
      if (e.key === '-' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setScale(prev => Math.max(0.1, Math.min(5, prev * 0.8)));
      }
      if (e.key === '0' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const c = containerRef.current;
        if (c && image) {
          const fit = Math.min(c.clientWidth / image.width, (c.clientHeight || 500) / image.height, 1);
          setScale(fit);
          setFitScale(fit);
        }
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpaceDown.current = false;
        setIsPanMode(false);
        setIsPanDragging(false);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [image]);

  // ── Scroll-wheel zoom (Ctrl/Cmd + scroll, pinch) ───────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      const factor = e.deltaY > 0 ? 0.92 : 1.08;

      setScale(prev => {
        const imgX = (localX + container.scrollLeft) / prev;
        const imgY = (localY + container.scrollTop) / prev;
        const next = Math.max(0.1, Math.min(5, prev * factor));
        scrollTargetRef.current = { left: imgX * next - localX, top: imgY * next - localY };
        return next;
      });
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Minimap: draw image ─────────────────────────────────
  useEffect(() => {
    if (!isZoomed) return;
    const c = minimapCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, mW, mH);
    ctx.drawImage(editCanvas || image, 0, 0, mW, mH);
  }, [editCanvas, image, imageData, mW, mH, isZoomed]);

  // ── Minimap: update viewport rect on scroll ─────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const imgPxW = image.width * scale;
      const imgPxH = image.height * scale;
      const vl = Math.max(0, container.scrollLeft) / scale;
      const vt = Math.max(0, container.scrollTop) / scale;
      const vr = Math.min(imgPxW, container.scrollLeft + container.clientWidth) / scale;
      const vb = Math.min(imgPxH, container.scrollTop + container.clientHeight) / scale;

      setMinimapViewport({
        x: (vl / image.width) * mW,
        y: (vt / image.height) * mH,
        w: Math.min(((vr - vl) / image.width) * mW, mW),
        h: Math.min(((vb - vt) / image.height) * mH, mH),
      });
    };

    update();
    container.addEventListener('scroll', update);
    return () => container.removeEventListener('scroll', update);
  }, [scale, image, mW, mH]);

  // ── Konva handlers (guarded by pan mode) ────────────────
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (selectionMode !== 'click' || isSpaceDown.current) return;
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const x = Math.floor(pointer.x / scale);
      const y = Math.floor(pointer.y / scale);
      if (x >= 0 && x < imageData.width && y >= 0 && y < imageData.height) {
        const nativeEvent = e.evt as MouseEvent;
        const mode = nativeEvent.shiftKey ? 'add' : nativeEvent.altKey ? 'subtract' : 'replace';
        onPixelClick(x, y, mode);
      }
    },
    [selectionMode, scale, imageData, onPixelClick]
  );

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (selectionMode !== 'lasso' || isSpaceDown.current) return;
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const nativeEvent = e.evt as MouseEvent;
      lassoModeRef.current = nativeEvent.shiftKey ? 'add' : nativeEvent.altKey ? 'subtract' : 'trim';
      setIsDrawingLasso(true);
      setLassoPoints([pointer.x / scale, pointer.y / scale]);
    },
    [selectionMode, scale]
  );

  const handleMouseMove = useCallback(
    (_e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!isDrawingLasso) return;
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      setLassoPoints(prev => [...prev, pointer.x / scale, pointer.y / scale]);
    },
    [isDrawingLasso, scale]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawingLasso || lassoPoints.length < 6) {
      setIsDrawingLasso(false);
      setLassoPoints([]);
      return;
    }
    const polygon: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < lassoPoints.length; i += 2) {
      polygon.push({ x: Math.floor(lassoPoints[i]), y: Math.floor(lassoPoints[i + 1]) });
    }
    setIsDrawingLasso(false);
    setLassoPoints([]);
    onLassoComplete(polygon, lassoModeRef.current);
  }, [isDrawingLasso, lassoPoints, onLassoComplete]);

  // ── Pan overlay: mousedown starts window-level drag ─────
  const handlePanDown = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    e.preventDefault();
    setIsPanDragging(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startSL = container.scrollLeft;
    const startST = container.scrollTop;

    const onMove = (me: MouseEvent) => {
      container.scrollLeft = startSL - (me.clientX - startX);
      container.scrollTop = startST - (me.clientY - startY);
    };
    const onUp = () => {
      setIsPanDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  // ── Minimap: click/drag to navigate ─────────────────────
  const handleMinimapDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const navigate = (cx: number, cy: number) => {
      const mx = cx - rect.left;
      const my = cy - rect.top;
      const imgX = (mx / mW) * image.width;
      const imgY = (my / mH) * image.height;
      container.scrollLeft = imgX * scale - container.clientWidth / 2;
      container.scrollTop = imgY * scale - container.clientHeight / 2;
    };

    navigate(e.clientX, e.clientY);
    minimapDragging.current = true;

    const onMove = (me: MouseEvent) => {
      if (!minimapDragging.current) return;
      navigate(me.clientX, me.clientY);
    };
    const onUp = () => {
      minimapDragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [scale, image, mW, mH]);

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      {/* Scrollable canvas area */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-auto"
        style={{
          backgroundColor: '#ffffff',
          backgroundImage: 'repeating-conic-gradient(#e0e0e0 0% 25%, #ffffff 0% 50%)',
          backgroundSize: '20px 20px',
        }}
      >
        <Stage
          ref={stageRef}
          width={scaledWidth}
          height={scaledHeight}
          onClick={handleStageClick}
          onTap={handleStageClick}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          onMouseMove={handleMouseMove}
          onTouchMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchEnd={handleMouseUp}
        >
          <Layer>
            <KonvaImage image={editCanvas || image} scaleX={scale} scaleY={scale} />
            {overlayImage && (
              <KonvaImage image={overlayImage} scaleX={scale} scaleY={scale} opacity={1} />
            )}
            {lassoPoints.length >= 4 && (
              <Line
                points={lassoPoints.map(p => p * scale)}
                stroke="#3b82f6"
                strokeWidth={2}
                dash={[6, 3]}
                closed={!isDrawingLasso}
                fill={isDrawingLasso ? undefined : 'rgba(59,130,246,0.1)'}
              />
            )}
          </Layer>
        </Stage>
      </div>

      {/* Pan overlay — intercepts mouse for space+drag pan */}
      {isPanMode && (
        <div
          className="absolute inset-0 z-20"
          style={{ cursor: isPanDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handlePanDown}
        />
      )}

      {/* Pan mode indicator */}
      {isPanMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-gray-900/80 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full shadow-lg pointer-events-none select-none flex items-center gap-1.5">
          <Hand className="w-3.5 h-3.5" />
          Drag to pan
        </div>
      )}

      {/* Minimap — visible when zoomed in */}
      {isZoomed && (
        <div className="absolute bottom-3 left-3 z-30 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200/80 p-1.5">
          <div className="relative overflow-hidden rounded" style={{ width: mW, height: mH }}>
            <canvas ref={minimapCanvasRef} width={mW} height={mH} className="block" />
            {/* Viewport indicator */}
            <div
              className="absolute border-2 border-amber-500 bg-amber-500/15 rounded-[1px]"
              style={{
                left: Math.max(0, minimapViewport.x),
                top: Math.max(0, minimapViewport.y),
                width: Math.min(minimapViewport.w, mW - Math.max(0, minimapViewport.x)),
                height: Math.min(minimapViewport.h, mH - Math.max(0, minimapViewport.y)),
              }}
            />
            {/* Click/drag to navigate */}
            <div
              className="absolute inset-0 cursor-crosshair"
              onMouseDown={handleMinimapDown}
            />
          </div>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1 bg-gray-900/90 backdrop-blur-sm rounded-xl px-2.5 py-1.5 shadow-xl border border-white/10">
        <button
          onClick={() => handleZoom('out')}
          className="w-7 h-7 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-sm"
          title="Zoom out (−)"
        >−</button>
        <span className="text-white/90 text-[11px] font-mono w-11 text-center select-none">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => handleZoom('in')}
          className="w-7 h-7 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-sm"
          title="Zoom in (+)"
        >+</button>
        <div className="h-4 w-px bg-white/20 mx-0.5" />
        <button
          onClick={() => handleZoom('fit')}
          className="h-7 px-2 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-[10px] font-medium"
          title="Fit to view (0)"
        >Fit</button>
        <button
          onClick={() => setScale(1)}
          className="h-7 px-1.5 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-[10px] font-mono"
          title="Actual pixels"
        >1:1</button>
      </div>
    </div>
  );
}
