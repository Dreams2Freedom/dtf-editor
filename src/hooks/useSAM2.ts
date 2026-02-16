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

      // Draw mask at display size
      ctx.drawImage(img, 0, 0, width, height);
      const imgData = ctx.getImageData(0, 0, width, height);
      const pixels = imgData.data;

      // Convert: white pixels -> alpha=255 (foreground), black -> alpha=0
      const result = new ImageData(width, height);
      for (let i = 0; i < pixels.length; i += 4) {
        const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        result.data[i] = 255; // R
        result.data[i + 1] = 255; // G
        result.data[i + 2] = 255; // B
        result.data[i + 3] = brightness > 128 ? 255 : 0; // A
      }

      resolve(result);
    };
    img.onerror = () => reject(new Error('Failed to load mask image'));
    img.src = maskBase64;
  });
}

/**
 * Hook for SAM2 background removal using server-side Replicate segmentation.
 * Each point interaction triggers a server API call to Replicate.
 */
export function useSAM2(options?: UseSAM2Options): UseSAM2Return {
  const [status, setStatus] = useState<AsyncStatus>('idle');
  const [currentMask, setCurrentMask] = useState<ImageData | null>(null);
  const [points, setPoints] = useState<PointPrompt[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const imageUrlRef = useRef<string>('');
  const displaySizeRef = useRef({ width: 512, height: 512 });
  const undoStackRef = useRef<PointPrompt[][]>([]);

  // Call the segment API and return mask as ImageData
  const callSegmentApi = useCallback(
    async (currentPoints: PointPrompt[]): Promise<ImageData | null> => {
      const response = await fetch('/api/sam2/segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: imageUrlRef.current,
          points: currentPoints.length > 0 ? currentPoints : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ||
            `Segment failed: ${response.status}`
        );
      }

      const data: SegmentResponse = await response.json();
      if (!data.success || !data.maskBase64) {
        throw new Error(data.error || 'No mask returned');
      }

      // Calculate display dimensions (fit to max 512px)
      const imgSize = data.imageSize || { width: 1024, height: 1024 };
      const maxDim = 512;
      const scale = Math.min(
        maxDim / imgSize.width,
        maxDim / imgSize.height,
        1
      );
      const displayW = Math.round(imgSize.width * scale);
      const displayH = Math.round(imgSize.height * scale);
      displaySizeRef.current = { width: displayW, height: displayH };

      // Convert mask PNG to ImageData
      return maskPngToImageData(data.maskBase64, displayW, displayH);
    },
    []
  );

  // Start segmentation with auto-detect (center point)
  const startSegmentation = useCallback(
    async (imageUrl: string) => {
      imageUrlRef.current = imageUrl;
      setStatus('loading');
      setIsProcessing(true);

      try {
        const mask = await callSegmentApi([]);
        setCurrentMask(mask);
        setStatus('ready');
        options?.onReady?.();
        if (mask) options?.onMaskUpdate?.(mask);
      } catch (err) {
        console.error('[useSAM2] Auto-segment failed:', err);
        setStatus('error');
        options?.onError?.(
          `Segmentation failed: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [callSegmentApi, options]
  );

  // Add a point and re-segment via server
  const addPoint = useCallback(
    async (point: PointPrompt) => {
      undoStackRef.current.push([...points]);

      const newPoints = [...points, point];
      setPoints(newPoints);
      setIsProcessing(true);

      try {
        const mask = await callSegmentApi(newPoints);
        setCurrentMask(mask);
        if (mask) options?.onMaskUpdate?.(mask);
      } catch (err) {
        console.error('[useSAM2] Segment failed:', err);
        options?.onError?.(
          `Segmentation failed: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [points, callSegmentApi, options]
  );

  // Undo last point and re-segment
  const undoPoint = useCallback(async () => {
    const previousState = undoStackRef.current.pop();
    if (previousState === undefined) return;

    setPoints(previousState);
    setIsProcessing(true);

    try {
      const mask = await callSegmentApi(previousState);
      setCurrentMask(mask);
      if (mask) options?.onMaskUpdate?.(mask);
    } catch (err) {
      console.error('[useSAM2] Segment failed:', err);
      options?.onError?.(
        `Segmentation failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setIsProcessing(false);
    }
  }, [callSegmentApi, options]);

  // Clear all points and re-segment (auto-detect)
  const clearPoints = useCallback(async () => {
    undoStackRef.current = [];
    setPoints([]);
    setIsProcessing(true);

    try {
      const mask = await callSegmentApi([]);
      setCurrentMask(mask);
      if (mask) options?.onMaskUpdate?.(mask);
    } catch (err) {
      console.error('[useSAM2] Segment failed:', err);
      options?.onError?.(
        `Segmentation failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setIsProcessing(false);
    }
  }, [callSegmentApi, options]);

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
