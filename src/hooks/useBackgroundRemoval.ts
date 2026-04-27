'use client';

import { useCallback, useRef, useState } from 'react';

import { embedImage, predictMask, removeBackground } from '@/services/bgRemoval';
import type {
  BgRemovalModel,
  BgRemovalStatus,
  SamPoint,
  SamSession,
} from '@/types/backgroundRemoval';

export interface UseBackgroundRemovalReturn {
  status: BgRemovalStatus;
  error: string | null;
  samSession: SamSession | null;
  /** Run one-shot auto removal. Returns masked image as an HTMLImageElement. */
  runAutoRemoval: (
    canvas: HTMLCanvasElement,
    model?: BgRemovalModel
  ) => Promise<HTMLImageElement | null>;
  /** Generate SAM embedding for the current canvas contents. */
  runEmbed: (canvas: HTMLCanvasElement) => Promise<void>;
  /** Run SAM prediction with prompt points. Returns updated masked image. */
  runPredict: (points: SamPoint[]) => Promise<HTMLImageElement | null>;
  reset: () => void;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to convert canvas to blob'));
    }, 'image/png');
  });
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load result image'));
    img.src = url;
  });
}

export function useBackgroundRemoval(): UseBackgroundRemovalReturn {
  const [status, setStatus] = useState<BgRemovalStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [samSession, setSamSession] = useState<SamSession | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStatus('idle');
    setError(null);
    setSamSession(null);
  }, []);

  const runAutoRemoval = useCallback(
    async (
      canvas: HTMLCanvasElement,
      model: BgRemovalModel = 'isnet-general-use'
    ): Promise<HTMLImageElement | null> => {
      try {
        setError(null);
        setStatus('authorizing');

        const blob = await canvasToBlob(canvas);

        setStatus('removing');
        const { blob: resultBlob } = await removeBackground(blob, model);

        const img = await blobToImage(resultBlob);
        setStatus('done');
        return img;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
        setStatus('error');
        return null;
      }
    },
    []
  );

  const runEmbed = useCallback(async (canvas: HTMLCanvasElement): Promise<void> => {
    try {
      setError(null);
      setStatus('embedding');

      const blob = await canvasToBlob(canvas);
      const session = await embedImage(blob);
      setSamSession(session);
      setStatus('idle');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setStatus('error');
    }
  }, []);

  const runPredict = useCallback(
    async (points: SamPoint[]): Promise<HTMLImageElement | null> => {
      if (!samSession) {
        setError('No SAM session — run embed first');
        return null;
      }
      try {
        setError(null);
        setStatus('predicting');

        const { blob: resultBlob } = await predictMask(samSession, points);
        const img = await blobToImage(resultBlob);
        setStatus('done');
        return img;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
        setStatus('error');
        return null;
      }
    },
    [samSession]
  );

  return { status, error, samSession, runAutoRemoval, runEmbed, runPredict, reset };
}
