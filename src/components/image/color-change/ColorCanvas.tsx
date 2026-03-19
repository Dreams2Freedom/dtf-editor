'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Line } from 'react-konva';
import Konva from 'konva';
import { SelectionMask, SelectionMode } from '@/types/colorChange';
import { createSelectionOverlay } from './SelectionTools';

interface ColorCanvasProps {
  image: HTMLImageElement;
  /** The offscreen canvas with current pixel state (includes applied changes) */
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
  const [overlayImage, setOverlayImage] = useState<HTMLCanvasElement | null>(null);
  const [lassoPoints, setLassoPoints] = useState<number[]>([]);
  const [isDrawingLasso, setIsDrawingLasso] = useState(false);
  const lassoModeRef = useRef<'trim' | 'add' | 'subtract'>('trim');
  const [scale, setScale] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (!containerRef.current || !image) return;
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight || 500;
    const scaleX = containerWidth / image.width;
    const scaleY = containerHeight / image.height;
    const fitScale = Math.min(scaleX, scaleY, 1);
    setScale(fitScale);
    setStageSize({
      width: containerWidth,
      height: Math.max(image.height * fitScale, 300),
    });
  }, [image]);

  useEffect(() => {
    if (!currentMask) {
      setOverlayImage(null);
      return;
    }
    const overlayData = createSelectionOverlay(currentMask, imageData.width, imageData.height);
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(overlayData, 0, 0);
      setOverlayImage(canvas);
    }
  }, [currentMask, imageData]);

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (selectionMode !== 'click') return;
      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const x = Math.floor(pointer.x / scale);
      const y = Math.floor(pointer.y / scale);

      if (x >= 0 && x < imageData.width && y >= 0 && y < imageData.height) {
        // Detect modifier keys for add/subtract selection
        const nativeEvent = e.evt as MouseEvent;
        const mode = nativeEvent.shiftKey ? 'add' : nativeEvent.altKey ? 'subtract' : 'replace';
        onPixelClick(x, y, mode);
      }
    },
    [selectionMode, scale, imageData, onPixelClick]
  );

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (selectionMode !== 'lasso') return;
      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      // Capture modifier keys at start of lasso draw
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

  const handleZoom = useCallback((direction: 'in' | 'out' | 'fit') => {
    if (direction === 'fit') {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight || 500;
      const scaleX = containerWidth / image.width;
      const scaleY = containerHeight / image.height;
      setScale(Math.min(scaleX, scaleY, 1));
    } else {
      setScale(prev => Math.max(0.1, Math.min(5, prev + (direction === 'in' ? 0.2 : -0.2))));
    }
  }, [image]);

  // Stage dimensions = scaled image size (allows scrolling when zoomed)
  const scaledWidth = Math.max(image.width * scale, stageSize.width);
  const scaledHeight = Math.max(image.height * scale, stageSize.height);

  return (
    <div ref={containerRef} className="relative flex-1 min-h-[300px] overflow-auto" style={{
      background: 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 0 0 / 20px 20px',
    }}>
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
          {/* Render from editCanvas (reflects applied color changes) or fall back to original image */}
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
      <div className="absolute bottom-3 right-3 flex gap-1">
        <button onClick={() => handleZoom('in')} className="w-7 h-7 bg-white border border-gray-200 rounded-md flex items-center justify-center text-sm text-gray-600 hover:bg-gray-50">+</button>
        <button onClick={() => handleZoom('out')} className="w-7 h-7 bg-white border border-gray-200 rounded-md flex items-center justify-center text-sm text-gray-600 hover:bg-gray-50">−</button>
        <button onClick={() => handleZoom('fit')} className="w-7 h-7 bg-white border border-gray-200 rounded-md flex items-center justify-center text-xs text-gray-600 hover:bg-gray-50">⊡</button>
      </div>
    </div>
  );
}
