'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { drawCheckerboard, renderMaskedPreview } from '@/lib/sam2/mask-utils';
import { Loader2 } from 'lucide-react';

interface MaskPreviewProps {
  imageUrl: string;
  mask: ImageData | null;
  isProcessing: boolean;
}

/**
 * Preview pane showing the image with background removed (checkerboard pattern).
 * Updates in real-time as the mask changes.
 */
export function MaskPreview({
  imageUrl,
  mask,
  isProcessing,
}: MaskPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dimensionsRef = useRef({ width: 0, height: 0 });

  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const sourceCanvas = sourceCanvasRef.current;
    if (!canvas || !sourceCanvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensionsRef.current;
    if (width === 0 || height === 0) return;

    // Draw checkerboard background
    drawCheckerboard(ctx, width, height, 10);

    // Overlay the masked image
    if (mask) {
      renderMaskedPreview(sourceCanvas, mask, canvas);
    } else {
      // No mask yet — show original image faded
      ctx.globalAlpha = 0.3;
      ctx.drawImage(sourceCanvas, 0, 0, width, height);
      ctx.globalAlpha = 1.0;
    }
  }, [mask]);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;

      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const maxHeight = 500;

      const scale = Math.min(
        containerWidth / img.naturalWidth,
        maxHeight / img.naturalHeight,
        1
      );

      const width = Math.round(img.naturalWidth * scale);
      const height = Math.round(img.naturalHeight * scale);
      dimensionsRef.current = { width, height };

      // Set up the source canvas (holds the original image for masking)
      const source = document.createElement('canvas');
      source.width = width;
      source.height = height;
      const sourceCtx = source.getContext('2d');
      if (sourceCtx) {
        sourceCtx.drawImage(img, 0, 0, width, height);
      }
      sourceCanvasRef.current = source;

      // Set up display canvas
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = width;
        canvas.height = height;
      }

      drawPreview();
    };
    img.src = imageUrl;
  }, [imageUrl, drawPreview]);

  // Redraw when mask changes
  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  return (
    <div ref={containerRef} className="flex-1 min-w-0">
      <div className="text-xs text-gray-500 mb-1 text-center">Preview</div>
      <div className="relative inline-block rounded-lg border border-gray-200 overflow-hidden">
        <canvas ref={canvasRef} className="block max-w-full" />
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
      </div>
    </div>
  );
}
