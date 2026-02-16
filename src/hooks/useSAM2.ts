'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { SAM2Decoder } from '@/lib/sam2/decoder';
import type {
  SAM2Embeddings,
  PointPrompt,
  SAM2MaskOutput,
  AsyncStatus,
  EncodeResponse,
} from '@/lib/sam2/types';

interface UseSAM2Options {
  onEncoderReady?: () => void;
  onDecoderReady?: () => void;
  onMaskUpdate?: (mask: ImageData) => void;
  onError?: (error: string) => void;
}

interface UseSAM2Return {
  encoderStatus: AsyncStatus;
  decoderStatus: AsyncStatus;
  currentMask: ImageData | null;
  maskScore: number;
  points: PointPrompt[];
  isProcessing: boolean;

  encodeImage: (imageFile: File) => Promise<void>;
  addPoint: (
    point: PointPrompt,
    canvasWidth: number,
    canvasHeight: number
  ) => Promise<void>;
  undoPoint: (canvasWidth: number, canvasHeight: number) => Promise<void>;
  clearPoints: (canvasWidth: number, canvasHeight: number) => Promise<void>;
  autoSegment: (canvasWidth: number, canvasHeight: number) => Promise<void>;
  dispose: () => void;
}

export function useSAM2(options?: UseSAM2Options): UseSAM2Return {
  const [encoderStatus, setEncoderStatus] = useState<AsyncStatus>('idle');
  const [decoderStatus, setDecoderStatus] = useState<AsyncStatus>('idle');
  const [currentMask, setCurrentMask] = useState<ImageData | null>(null);
  const [maskScore, setMaskScore] = useState<number>(0);
  const [points, setPoints] = useState<PointPrompt[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Refs for values that shouldn't trigger re-renders
  const decoderRef = useRef<SAM2Decoder | null>(null);
  const embeddingsRef = useRef<SAM2Embeddings | null>(null);
  const undoStackRef = useRef<PointPrompt[][]>([]);

  // Initialize the ONNX decoder
  const initDecoder = useCallback(async () => {
    if (decoderRef.current?.isReady) return;

    setDecoderStatus('loading');
    try {
      const decoder = new SAM2Decoder();
      await decoder.initialize();
      decoderRef.current = decoder;
      setDecoderStatus('ready');
      options?.onDecoderReady?.();
    } catch (err) {
      console.error('[useSAM2] Decoder initialization failed:', err);
      setDecoderStatus('error');
      options?.onError?.(
        `Failed to load AI model: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }, [options]);

  // Run decoder with current points
  const runDecoder = useCallback(
    async (
      currentPoints: PointPrompt[],
      canvasWidth: number,
      canvasHeight: number
    ) => {
      if (!decoderRef.current?.isReady || !embeddingsRef.current) return;

      setIsProcessing(true);
      try {
        let result: SAM2MaskOutput;

        if (currentPoints.length === 0) {
          result = await decoderRef.current.autoSegment(
            embeddingsRef.current,
            canvasWidth,
            canvasHeight
          );
        } else {
          result = await decoderRef.current.predict(
            embeddingsRef.current,
            currentPoints,
            canvasWidth,
            canvasHeight
          );
        }

        setCurrentMask(result.mask);
        setMaskScore(result.score);
        options?.onMaskUpdate?.(result.mask);
      } catch (err) {
        console.error('[useSAM2] Decoder inference failed:', err);
        options?.onError?.(
          `Segmentation failed: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [options]
  );

  // Encode image via server API
  const encodeImage = useCallback(
    async (imageFile: File) => {
      setEncoderStatus('loading');

      // Start loading the decoder in parallel
      initDecoder();

      try {
        const formData = new FormData();
        formData.append('image', imageFile);

        const response = await fetch('/api/sam2/encode', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `Encode failed: ${response.status}`);
        }

        const data: EncodeResponse = await response.json();

        if (!data.success || !data.embeddings) {
          throw new Error(data.error || 'No embeddings returned');
        }

        embeddingsRef.current = {
          data: data.embeddings,
          shape: data.shape || [1, 256, 64, 64],
          imageSize: data.imageSize || { width: 1024, height: 1024 },
        };

        setEncoderStatus('ready');
        options?.onEncoderReady?.();
      } catch (err) {
        console.error('[useSAM2] Encoding failed:', err);
        setEncoderStatus('error');
        options?.onError?.(
          `Image encoding failed: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    },
    [initDecoder, options]
  );

  // Add a point and re-run decoder
  const addPoint = useCallback(
    async (point: PointPrompt, canvasWidth: number, canvasHeight: number) => {
      // Save current state for undo
      undoStackRef.current.push([...points]);

      const newPoints = [...points, point];
      setPoints(newPoints);
      await runDecoder(newPoints, canvasWidth, canvasHeight);
    },
    [points, runDecoder]
  );

  // Undo last point
  const undoPoint = useCallback(
    async (canvasWidth: number, canvasHeight: number) => {
      const previousState = undoStackRef.current.pop();
      if (previousState !== undefined) {
        setPoints(previousState);
        await runDecoder(previousState, canvasWidth, canvasHeight);
      }
    },
    [runDecoder]
  );

  // Clear all points and re-run auto-segment
  const clearPoints = useCallback(
    async (canvasWidth: number, canvasHeight: number) => {
      undoStackRef.current = [];
      setPoints([]);
      await runDecoder([], canvasWidth, canvasHeight);
    },
    [runDecoder]
  );

  // Auto-segment (center point)
  const autoSegment = useCallback(
    async (canvasWidth: number, canvasHeight: number) => {
      if (!decoderRef.current?.isReady || !embeddingsRef.current) return;
      await runDecoder([], canvasWidth, canvasHeight);
    },
    [runDecoder]
  );

  // Cleanup on unmount
  const dispose = useCallback(() => {
    decoderRef.current?.dispose();
    decoderRef.current = null;
    embeddingsRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      decoderRef.current?.dispose();
    };
  }, []);

  return {
    encoderStatus,
    decoderStatus,
    currentMask,
    maskScore,
    points,
    isProcessing,
    encodeImage,
    addPoint,
    undoPoint,
    clearPoints,
    autoSegment,
    dispose,
  };
}
