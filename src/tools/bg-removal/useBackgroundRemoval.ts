'use client';

import { useCallback, useRef, useState } from 'react';

import {
  detectBackground,
  embedImage,
  predictMask,
  removeBackground,
} from './api';
import type {
  BgDetectionResult,
  BgRemovalStatus,
  RGB,
  RemovalOptions,
  SamPoint,
  SamSession,
} from './types';

export interface UseBackgroundRemovalReturn {
  status: BgRemovalStatus;
  error: string | null;
  detection: BgDetectionResult | null;
  samSession: SamSession | null;
  /** Run full server removal pipeline with the given options. */
  runRemoval: (
    canvas: HTMLCanvasElement,
    options: RemovalOptions
  ) => Promise<HTMLImageElement | null>;
  /** Detect the background color from edges (returns + stores result). */
  runDetect: (canvas: HTMLCanvasElement) => Promise<BgDetectionResult | null>;
  /** Generate SAM embedding for the current canvas contents. */
  runEmbed: (canvas: HTMLCanvasElement) => Promise<void>;
  /** Run SAM prediction with prompt points. Returns updated masked image. */
  runPredict: (points: SamPoint[]) => Promise<HTMLImageElement | null>;
  /** Run SAM prediction and additionally return the binary alpha mask (1 byte/pixel, 0 or 1). */
  runPredictRaw: (points: SamPoint[]) => Promise<{
    img: HTMLImageElement;
    mask: Uint8Array;
    width: number;
    height: number;
  } | null>;
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

/**
 * Client-side BFS flood-fill removing pixels matching `target` within
 * `tolerance` (squared-Euclidean RGB distance threshold).
 *
 * Used for instant tolerance-slider preview. Server is the source of truth on save.
 *
 * If `seedPoint` is null: seeds BFS from every edge pixel that matches.
 * Otherwise seeds BFS from that single coordinate (click-to-remove).
 *
 * Operates IN PLACE on the supplied ImageData and returns the same reference.
 */
export function clientFloodFill(
  src: ImageData,
  target: RGB,
  tolerance: number,
  seedPoint: { x: number; y: number } | null = null
): ImageData {
  const { data, width: w, height: h } = src;
  const total = w * h;
  const tr = target[0];
  const tg = target[1];
  const tb = target[2];
  const tolSq = tolerance * tolerance;

  // Pre-compute removable bitmap (Uint8Array with 0/1)
  const removable = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    const j = i * 4;
    const a = data[j + 3];
    if (a < 10) {
      removable[i] = 1;
      continue;
    }
    const dr = data[j] - tr;
    const dg = data[j + 1] - tg;
    const db = data[j + 2] - tb;
    if (dr * dr + dg * dg + db * db <= tolSq) {
      removable[i] = 1;
    }
  }

  const visited = new Uint8Array(total);
  // Use a Uint32Array ring buffer for the queue to avoid allocations
  const queue = new Uint32Array(total);
  let qHead = 0;
  let qTail = 0;

  if (seedPoint === null) {
    // Seed from edges
    for (let x = 0; x < w; x++) {
      const top = x;
      const bottom = (h - 1) * w + x;
      if (removable[top] && !visited[top]) {
        visited[top] = 1;
        queue[qTail++] = top;
      }
      if (removable[bottom] && !visited[bottom]) {
        visited[bottom] = 1;
        queue[qTail++] = bottom;
      }
    }
    for (let y = 1; y < h - 1; y++) {
      const left = y * w;
      const right = y * w + (w - 1);
      if (removable[left] && !visited[left]) {
        visited[left] = 1;
        queue[qTail++] = left;
      }
      if (removable[right] && !visited[right]) {
        visited[right] = 1;
        queue[qTail++] = right;
      }
    }
  } else {
    const sx = Math.max(0, Math.min(w - 1, Math.round(seedPoint.x)));
    const sy = Math.max(0, Math.min(h - 1, Math.round(seedPoint.y)));
    const idx = sy * w + sx;
    if (removable[idx]) {
      visited[idx] = 1;
      queue[qTail++] = idx;
    }
  }

  while (qHead < qTail) {
    const idx = queue[qHead++];
    const y = (idx / w) | 0;
    const x = idx - y * w;
    // 4-neighbours
    if (y > 0) {
      const u = idx - w;
      if (removable[u] && !visited[u]) {
        visited[u] = 1;
        queue[qTail++] = u;
      }
    }
    if (y < h - 1) {
      const d = idx + w;
      if (removable[d] && !visited[d]) {
        visited[d] = 1;
        queue[qTail++] = d;
      }
    }
    if (x > 0) {
      const l = idx - 1;
      if (removable[l] && !visited[l]) {
        visited[l] = 1;
        queue[qTail++] = l;
      }
    }
    if (x < w - 1) {
      const r = idx + 1;
      if (removable[r] && !visited[r]) {
        visited[r] = 1;
        queue[qTail++] = r;
      }
    }
  }

  // Zero alpha for visited
  for (let i = 0; i < total; i++) {
    if (visited[i]) {
      data[i * 4 + 3] = 0;
    }
  }

  return src;
}

/**
 * Multi-color BFS flood-fill (Phase 1.14).
 *
 * A pixel is "removable" if it's closer to any color in `removePalette`
 * than to any color in `keepPalette`, within `tolerance` (squared-Euclidean).
 * Already-transparent pixels (alpha < 10) are also removable so connectivity
 * works through gaps. Pixels close to a keep color act as barriers — BFS
 * cannot walk through them, which preserves same-color content trapped
 * inside a kept region.
 *
 * Operates IN PLACE on the supplied ImageData and returns the same reference.
 */
export function clientMultiFloodFill(
  src: ImageData,
  removePalette: RGB[],
  keepPalette: RGB[],
  tolerance: number,
  seedPoint: { x: number; y: number } | null = null
): ImageData {
  if (removePalette.length === 0) return src; // nothing to do
  const { data, width: w, height: h } = src;
  const total = w * h;
  const tolSq = tolerance * tolerance;

  // Pre-classify: 1 = removable, 0 = wall (preserved or barrier).
  const removable = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    const j = i * 4;
    const a = data[j + 3];
    if (a < 10) {
      removable[i] = 1;
      continue;
    }
    const r = data[j];
    const g = data[j + 1];
    const b = data[j + 2];

    let dR = Infinity;
    for (let k = 0; k < removePalette.length; k++) {
      const c = removePalette[k];
      const dr = r - c[0];
      const dg = g - c[1];
      const db = b - c[2];
      const d = dr * dr + dg * dg + db * db;
      if (d < dR) dR = d;
    }

    let dK = Infinity;
    for (let k = 0; k < keepPalette.length; k++) {
      const c = keepPalette[k];
      const dr = r - c[0];
      const dg = g - c[1];
      const db = b - c[2];
      const d = dr * dr + dg * dg + db * db;
      if (d < dK) dK = d;
    }

    if (dR <= tolSq && dR < dK) {
      removable[i] = 1;
    }
  }

  const visited = new Uint8Array(total);
  const queue = new Uint32Array(total);
  let qHead = 0;
  let qTail = 0;

  if (seedPoint === null) {
    // Seed from edges
    for (let x = 0; x < w; x++) {
      const top = x;
      const bottom = (h - 1) * w + x;
      if (removable[top] && !visited[top]) {
        visited[top] = 1;
        queue[qTail++] = top;
      }
      if (removable[bottom] && !visited[bottom]) {
        visited[bottom] = 1;
        queue[qTail++] = bottom;
      }
    }
    for (let y = 1; y < h - 1; y++) {
      const left = y * w;
      const right = y * w + (w - 1);
      if (removable[left] && !visited[left]) {
        visited[left] = 1;
        queue[qTail++] = left;
      }
      if (removable[right] && !visited[right]) {
        visited[right] = 1;
        queue[qTail++] = right;
      }
    }
  } else {
    const sx = Math.max(0, Math.min(w - 1, Math.round(seedPoint.x)));
    const sy = Math.max(0, Math.min(h - 1, Math.round(seedPoint.y)));
    const idx = sy * w + sx;
    if (removable[idx]) {
      visited[idx] = 1;
      queue[qTail++] = idx;
    }
  }

  while (qHead < qTail) {
    const idx = queue[qHead++];
    const y = (idx / w) | 0;
    const x = idx - y * w;
    if (y > 0) {
      const u = idx - w;
      if (removable[u] && !visited[u]) {
        visited[u] = 1;
        queue[qTail++] = u;
      }
    }
    if (y < h - 1) {
      const d = idx + w;
      if (removable[d] && !visited[d]) {
        visited[d] = 1;
        queue[qTail++] = d;
      }
    }
    if (x > 0) {
      const l = idx - 1;
      if (removable[l] && !visited[l]) {
        visited[l] = 1;
        queue[qTail++] = l;
      }
    }
    if (x < w - 1) {
      const r = idx + 1;
      if (removable[r] && !visited[r]) {
        visited[r] = 1;
        queue[qTail++] = r;
      }
    }
  }

  for (let i = 0; i < total; i++) {
    if (visited[i]) {
      data[i * 4 + 3] = 0;
    }
  }

  return src;
}

/**
 * Sample points along a freehand path at `spacing`-pixel intervals.
 * First and last points always kept; intermediate points dropped if closer
 * than `spacing` to the last accepted point. Used to convert brush strokes
 * into SAM prompt points.
 */
export function samplePathPoints(
  path: Array<{ x: number; y: number }>,
  spacing: number
): Array<{ x: number; y: number }> {
  if (path.length === 0) return [];
  if (path.length === 1) return [path[0]];
  const minSq = Math.max(1, spacing) ** 2;
  const out: Array<{ x: number; y: number }> = [path[0]];
  for (let i = 1; i < path.length - 1; i++) {
    const last = out[out.length - 1];
    const dx = path[i].x - last.x;
    const dy = path[i].y - last.y;
    if (dx * dx + dy * dy >= minSq) {
      out.push(path[i]);
    }
  }
  const last = path[path.length - 1];
  const tail = out[out.length - 1];
  const dx = last.x - tail.x;
  const dy = last.y - tail.y;
  if (dx * dx + dy * dy > 0) out.push(last);
  return out;
}

export function useBackgroundRemoval(): UseBackgroundRemovalReturn {
  const [status, setStatus] = useState<BgRemovalStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [detection, setDetection] = useState<BgDetectionResult | null>(null);
  const [samSession, setSamSession] = useState<SamSession | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStatus('idle');
    setError(null);
    setDetection(null);
    setSamSession(null);
  }, []);

  const runDetect = useCallback(
    async (canvas: HTMLCanvasElement): Promise<BgDetectionResult | null> => {
      try {
        setError(null);
        setStatus('detecting');
        const blob = await canvasToBlob(canvas);
        const result = await detectBackground(blob);
        setDetection(result);
        setStatus('idle');
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
        setStatus('error');
        return null;
      }
    },
    []
  );

  const runRemoval = useCallback(
    async (
      canvas: HTMLCanvasElement,
      options: RemovalOptions
    ): Promise<HTMLImageElement | null> => {
      try {
        setError(null);
        setStatus('authorizing');
        const blob = await canvasToBlob(canvas);
        setStatus('removing');
        const { blob: resultBlob } = await removeBackground(blob, options);
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

  const runEmbed = useCallback(
    async (canvas: HTMLCanvasElement): Promise<void> => {
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
    },
    []
  );

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

  const runPredictRaw = useCallback(
    async (
      points: SamPoint[]
    ): Promise<{
      img: HTMLImageElement;
      mask: Uint8Array;
      width: number;
      height: number;
    } | null> => {
      if (!samSession) {
        setError('No SAM session — run embed first');
        return null;
      }
      try {
        setError(null);
        setStatus('predicting');
        const { blob: resultBlob } = await predictMask(samSession, points);
        const img = await blobToImage(resultBlob);
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const offCtx = off.getContext('2d');
        if (!offCtx) {
          throw new Error('Failed to get 2D context for mask extraction');
        }
        offCtx.drawImage(img, 0, 0);
        const imgData = offCtx.getImageData(0, 0, w, h);
        const mask = new Uint8Array(w * h);
        const src = imgData.data;
        for (let i = 0; i < mask.length; i++) {
          mask[i] = src[i * 4 + 3] > 127 ? 1 : 0;
        }
        setStatus('done');
        return { img, mask, width: w, height: h };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
        setStatus('error');
        return null;
      }
    },
    [samSession]
  );

  return {
    status,
    error,
    detection,
    samSession,
    runRemoval,
    runDetect,
    runEmbed,
    runPredict,
    runPredictRaw,
    reset,
  };
}
