'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { renderMaskOverlay } from '@/lib/sam2/mask-utils';
import type { PointPrompt, ToolMode } from '@/lib/sam2/types';

interface EditorCanvasProps {
  imageUrl: string;
  points: PointPrompt[];
  toolMode: ToolMode;
  onPointAdd: (point: PointPrompt) => void;
  mask: ImageData | null;
  disabled?: boolean;
}

/**
 * Interactive canvas for placing keep/remove marks on the image.
 * Renders the original image with a mask overlay and point markers.
 */
export function EditorCanvas({
  imageUrl,
  points,
  toolMode,
  onPointAdd,
  mask,
  disabled = false,
}: EditorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dimensions for the canvas
  const dimensionsRef = useRef({ width: 0, height: 0, scale: 1 });

  // Load and draw the image
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensionsRef.current;

    // Clear and draw image
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    // Draw mask overlay (semi-transparent red on removed areas)
    if (mask) {
      renderMaskOverlay(ctx, mask, width, height);
    }

    // Draw point markers
    for (const point of points) {
      const px = point.x * width;
      const py = point.y * height;

      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fillStyle =
        point.label === 1
          ? 'rgba(34, 197, 94, 0.8)' // green for keep
          : 'rgba(239, 68, 68, 0.8)'; // red for remove
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner dot
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
    }
  }, [mask, points]);

  // Load image and set canvas dimensions
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;

      const container = containerRef.current;
      if (!container) return;

      // Fit image to container while maintaining aspect ratio
      const containerWidth = container.clientWidth;
      const maxHeight = 500;

      const scale = Math.min(
        containerWidth / img.naturalWidth,
        maxHeight / img.naturalHeight,
        1 // Don't scale up
      );

      const width = Math.round(img.naturalWidth * scale);
      const height = Math.round(img.naturalHeight * scale);

      dimensionsRef.current = { width, height, scale };

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = width;
        canvas.height = height;
      }

      drawCanvas();
    };
    img.src = imageUrl;
  }, [imageUrl, drawCanvas]);

  // Redraw when mask or points change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Handle click/tap to add a point
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (disabled) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const { width, height } = dimensionsRef.current;

      // Calculate normalized coordinates (0-1)
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      // Clamp to valid range
      const clampedX = Math.max(0, Math.min(1, x));
      const clampedY = Math.max(0, Math.min(1, y));

      onPointAdd({
        x: clampedX,
        y: clampedY,
        label: toolMode === 'keep' ? 1 : 0,
      });
    },
    [disabled, toolMode, onPointAdd]
  );

  return (
    <div ref={containerRef} className="flex-1 min-w-0">
      <div className="text-xs text-gray-500 mb-1 text-center">
        Click to place marks
      </div>
      <div className="relative inline-block rounded-lg border border-gray-200 overflow-hidden bg-gray-100">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          className={`block max-w-full ${
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-crosshair'
          }`}
          style={{ touchAction: 'none' }}
        />
      </div>
    </div>
  );
}
