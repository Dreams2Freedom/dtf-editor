'use client';

import { useState, useRef, useCallback } from 'react';
import type {
  PointPrompt,
  AsyncStatus,
  SegmentResponse,
} from '@/lib/sam2/types';

interface UseSAM2Options {
  onReady?: () => void;
  onMaskUpdate?: (mask: ImageData) => void;
  onError?: (error: string) => void;
}

interface UseSAM2Return {
  status: AsyncStatus;
  currentMask: ImageData | null;
  points: PointPrompt[];
  isProcessing: boolean;

  startSegmentation: (imageUrl: string) => Promise<void>;
  addPoint: (point: PointPrompt) => Promise<void>;
  undoPoint: () => Promise<void>;
  clearPoints: () => Promise<void>;
}

/** Brush radius in pixels for client-side mask editing */
const BRUSH_RADIUS = 15;

/**
 * Convert a mask PNG (white=foreground, black=background) to ImageData
 * with proper alpha channel (255=foreground, 0=background).
 */
function maskPngToImageData(
  maskBase64: string,
  width: number,
  height: number
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to create canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const imgData = ctx.getImageData(0, 0, width, height);
      const pixels = imgData.data;

      const result = new ImageData(width, height);
      for (let i = 0; i < pixels.length; i += 4) {
        const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        result.data[i] = 255;
        result.data[i + 1] = 255;
        result.data[i + 2] = 255;
        result.data[i + 3] = brightness > 128 ? 255 : 0;
      }
      resolve(result);
    };
    img.onerror = () => reject(new Error('Failed to load mask image'));
    img.src = maskBase64;
  });
}

/**
 * Clone an ImageData object.
 */
function cloneImageData(src: ImageData): ImageData {
  const dst = new ImageData(src.width, src.height);
  dst.data.set(src.data);
  return dst;
}

/**
 * Paint a circle on the mask at the given normalized (0-1) coordinates.
 * label=1 (keep/green) sets alpha=255, label=0 (remove/red) sets alpha=0.
 */
function paintMaskCircle(
  mask: ImageData,
  nx: number,
  ny: number,
  label: 0 | 1,
  radius: number
): ImageData {
  const result = cloneImageData(mask);
  const cx = Math.round(nx * mask.width);
  const cy = Math.round(ny * mask.height);
  const alphaValue = label === 1 ? 255 : 0;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > radius * radius) continue;
      const px = cx + dx;
      const py = cy + dy;
      if (px < 0 || px >= mask.width || py < 0 || py >= mask.height) continue;
      const idx = (py * mask.width + px) * 4;
      result.data[idx + 3] = alphaValue;
    }
  }

  return result;
}

/**
 * Hook for background removal using server-side BiRefNet + client-side mask editing.
 * Initial removal calls the server once. Green/red marks edit the mask locally (instant).
 */
export function useSAM2(options?: UseSAM2Options): UseSAM2Return {
  const [status, setStatus] = useState<AsyncStatus>('idle');
  const [currentMask, setCurrentMask] = useState<ImageData | null>(null);
  const [points, setPoints] = useState<PointPrompt[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const imageUrlRef = useRef<string>('');
  const baseMaskRef = useRef<ImageData | null>(null);
  const undoStackRef = useRef<ImageData[]>([]);

  // Call the segment API (server-side BiRefNet) and return mask as ImageData
  const callSegmentApi = useCallback(
    async (): Promise<ImageData | null> => {
      const response = await fetch('/api/sam2/segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: imageUrlRef.current }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ||
            `Removal failed: ${response.status}`
        );
      }

      const data: SegmentResponse = await response.json();
      if (!data.success || !data.maskBase64) {
        throw new Error(data.error || 'No mask returned');
      }

      const imgSize = data.imageSize || { width: 1024, height: 1024 };
      const maxDim = 512;
      const scale = Math.min(
        maxDim / imgSize.width,
        maxDim / imgSize.height,
        1
      );
      const displayW = Math.round(imgSize.width * scale);
      const displayH = Math.round(imgSize.height * scale);

      return maskPngToImageData(data.maskBase64, displayW, displayH);
    },
    []
  );

  // Start background removal (one server call)
  const startSegmentation = useCallback(
    async (imageUrl: string) => {
      imageUrlRef.current = imageUrl;
      setStatus('loading');
      setIsProcessing(true);

      try {
        const mask = await callSegmentApi();
        baseMaskRef.current = mask;
        setCurrentMask(mask);
        setStatus('ready');
        options?.onReady?.();
        if (mask) options?.onMaskUpdate?.(mask);
      } catch (err) {
        console.error('[useSAM2] Background removal failed:', err);
        setStatus('error');
        options?.onError?.(
          `Background removal failed: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [callSegmentApi, options]
  );

  // Add a point and edit mask CLIENT-SIDE (instant, no server call)
  const addPoint = useCallback(
    async (point: PointPrompt) => {
      if (!currentMask) return;

      // Save current mask for undo
      undoStackRef.current.push(cloneImageData(currentMask));

      const newPoints = [...points, point];
      setPoints(newPoints);

      // Paint on the mask locally
      const updated = paintMaskCircle(
        currentMask,
        point.x,
        point.y,
        point.label,
        BRUSH_RADIUS
      );
      setCurrentMask(updated);
      options?.onMaskUpdate?.(updated);
    },
    [currentMask, points, options]
  );

  // Undo last point edit (restore previous mask)
  const undoPoint = useCallback(async () => {
    const previousMask = undoStackRef.current.pop();
    if (!previousMask) return;

    const newPoints = [...points];
    newPoints.pop();
    setPoints(newPoints);

    setCurrentMask(previousMask);
    options?.onMaskUpdate?.(previousMask);
  }, [points, options]);

  // Clear all edits and restore the original AI-generated mask
  const clearPoints = useCallback(async () => {
    undoStackRef.current = [];
    setPoints([]);

    if (baseMaskRef.current) {
      const restored = cloneImageData(baseMaskRef.current);
      setCurrentMask(restored);
      options?.onMaskUpdate?.(restored);
    }
  }, [options]);

  return {
    status,
    currentMask,
    points,
    isProcessing,
    startSegmentation,
    addPoint,
    undoPoint,
    clearPoints,
  };
}
