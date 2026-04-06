'use client';

import { useState, useCallback, useRef } from 'react';
import {
  BulkBgRemovalItem,
  BulkBgRemovalStatus,
  isRetryableStatus,
} from '@/types/bulkBgRemoval';
import { compressImage } from '@/lib/image-compression';

/** Convert a WebP file to PNG using canvas (ClippingMagic doesn't accept WebP) */
function convertWebpToPng(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file); // fallback to original
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        blob => {
          if (!blob) {
            resolve(file);
            return;
          }
          const pngName = file.name.replace(/\.webp$/i, '.png');
          resolve(new File([blob], pngName, { type: 'image/png' }));
        },
        'image/png'
      );
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to convert WebP to PNG'));
    };
    img.src = URL.createObjectURL(file);
  });
}

const DEFAULT_CONCURRENCY = 3;
const THROTTLED_CONCURRENCY = 1;
const THROTTLE_DELAY_MS = 5000;
const RESTORE_AFTER_SUCCESSES = 3;

export type BgRemovalQueuePhase = 'idle' | 'processing' | 'review' | 'complete' | 'halted';

interface QueueState {
  phase: BgRemovalQueuePhase;
  items: BulkBgRemovalItem[];
  totalCreditsUsed: number;
}

export function useBulkBgRemovalQueue() {
  const [state, setState] = useState<QueueState>({
    phase: 'idle',
    items: [],
    totalCreditsUsed: 0,
  });

  const cancelledRef = useRef(false);
  const cancelledItemsRef = useRef(new Set<string>());
  const concurrencyRef = useRef(DEFAULT_CONCURRENCY);
  const activeWorkersRef = useRef(0);
  const throttledRef = useRef(false);
  const consecutiveSuccessesRef = useRef(0);

  const updateItem = useCallback(
    (id: string, updates: Partial<BulkBgRemovalItem>) => {
      setState(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.id === id ? { ...item, ...updates } : item
        ),
      }));
    },
    []
  );

  const processOneImage = useCallback(
    async (item: BulkBgRemovalItem): Promise<void> => {
      updateItem(item.id, { status: 'uploading', progress: 5 });

      let fileToUpload = await compressImage(item.file, {
        maxSizeMB: 3,
        maxDimension: 5000,
      });

      // ClippingMagic doesn't support WebP — convert to PNG via canvas
      if (fileToUpload.type === 'image/webp') {
        fileToUpload = await convertWebpToPng(fileToUpload);
      }

      updateItem(item.id, { progress: 10 });

      const formData = new FormData();
      formData.append('image', fileToUpload);
      formData.append('operation', 'background-removal');

      updateItem(item.id, { status: 'processing', progress: 20 });

      let currentProgress = 20;
      const progressInterval = setInterval(() => {
        currentProgress = Math.min(90, currentProgress + Math.random() * 5);
        updateItem(item.id, { progress: currentProgress });
      }, 2000);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        const response = await fetch('/api/process', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        clearInterval(progressInterval);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(
            errorData.error || `Background removal failed (${response.status})`
          );
          (error as any).httpStatus = response.status;
          throw error;
        }

        const data = await response.json();

        updateItem(item.id, {
          status: 'complete',
          progress: 100,
          resultUrl: data.processedUrl,
          imageId: data.metadata?.savedId,
        });

        setState(prev => ({
          ...prev,
          totalCreditsUsed: prev.totalCreditsUsed + (data.metadata?.creditsUsed || 1),
        }));
      } catch (err) {
        clearInterval(progressInterval);
        throw err;
      }
    },
    [updateItem]
  );

  const processWithRetry = useCallback(
    async (item: BulkBgRemovalItem): Promise<void> => {
      try {
        await processOneImage(item);
        consecutiveSuccessesRef.current++;
        if (
          throttledRef.current &&
          consecutiveSuccessesRef.current >= RESTORE_AFTER_SUCCESSES
        ) {
          throttledRef.current = false;
          concurrencyRef.current = DEFAULT_CONCURRENCY;
          consecutiveSuccessesRef.current = 0;
        }
      } catch (err: any) {
        consecutiveSuccessesRef.current = 0;
        const httpStatus = err.httpStatus || 0;

        if (httpStatus === 402) {
          updateItem(item.id, {
            status: 'failed',
            error: 'Insufficient credits',
            progress: 0,
          });
          cancelledRef.current = true;
          setState(prev => ({ ...prev, phase: 'halted' }));
          return;
        }

        if (httpStatus && !isRetryableStatus(httpStatus)) {
          updateItem(item.id, {
            status: 'failed',
            error: err.message,
            progress: 0,
          });
          return;
        }

        if (httpStatus === 429) {
          throttledRef.current = true;
          concurrencyRef.current = THROTTLED_CONCURRENCY;
          consecutiveSuccessesRef.current = 0;
        }

        if (item.retryCount === 0) {
          updateItem(item.id, { status: 'retrying', retryCount: 1 });

          if (throttledRef.current) {
            await new Promise(r => setTimeout(r, THROTTLE_DELAY_MS));
          }

          try {
            await processOneImage(item);
            consecutiveSuccessesRef.current++;
            if (
              throttledRef.current &&
              consecutiveSuccessesRef.current >= RESTORE_AFTER_SUCCESSES
            ) {
              throttledRef.current = false;
              concurrencyRef.current = DEFAULT_CONCURRENCY;
              consecutiveSuccessesRef.current = 0;
            }
          } catch (retryErr: any) {
            updateItem(item.id, {
              status: 'failed',
              error: retryErr.message || 'Failed after retry',
              progress: 0,
            });
          }
        } else {
          updateItem(item.id, {
            status: 'failed',
            error: err.message,
            progress: 0,
          });
        }
      }
    },
    [processOneImage, updateItem]
  );

  const runQueue = useCallback(
    async (queuedItems: BulkBgRemovalItem[]) => {
      let nextIndex = 0;
      const totalItems = queuedItems.length;

      const processNext = async (workerId: number): Promise<void> => {
        while (nextIndex < totalItems && !cancelledRef.current) {
          if (workerId >= concurrencyRef.current) {
            activeWorkersRef.current--;
            return;
          }

          const currentIndex = nextIndex++;
          if (currentIndex >= totalItems) break;

          const item = queuedItems[currentIndex];

          if (cancelledItemsRef.current.has(item.id)) {
            updateItem(item.id, { status: 'cancelled' });
            continue;
          }

          if (throttledRef.current) {
            await new Promise(r => setTimeout(r, THROTTLE_DELAY_MS));
          }

          await processWithRetry(item);
        }
        activeWorkersRef.current--;
      };

      const workers: Promise<void>[] = [];
      for (let i = 0; i < DEFAULT_CONCURRENCY; i++) {
        activeWorkersRef.current++;
        workers.push(processNext(i));
      }

      await Promise.all(workers);
    },
    [processWithRetry, updateItem]
  );

  const startProcessing = useCallback(
    async (items: BulkBgRemovalItem[]) => {
      cancelledRef.current = false;
      cancelledItemsRef.current.clear();
      throttledRef.current = false;
      concurrencyRef.current = DEFAULT_CONCURRENCY;
      activeWorkersRef.current = 0;
      consecutiveSuccessesRef.current = 0;

      const queuedItems = items.map(item => ({
        ...item,
        status: 'queued' as BulkBgRemovalStatus,
        progress: 0,
        retryCount: 0,
        error: undefined,
        resultUrl: undefined,
        imageId: undefined,
        flaggedForEdit: false,
        editedUrl: undefined,
      }));

      setState({ phase: 'processing', items: queuedItems, totalCreditsUsed: 0 });

      await runQueue(queuedItems);

      if (!cancelledRef.current) {
        setState(prev => ({ ...prev, phase: 'review' }));
      }
    },
    [runQueue]
  );

  const cancelRemaining = useCallback(() => {
    cancelledRef.current = true;
    setState(prev => ({
      ...prev,
      phase: 'review',
      items: prev.items.map(item =>
        item.status === 'queued'
          ? { ...item, status: 'cancelled' as BulkBgRemovalStatus }
          : item
      ),
    }));
  }, []);

  const cancelQueuedItem = useCallback((id: string) => {
    cancelledItemsRef.current.add(id);
    setState(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === id && item.status === 'queued'
          ? { ...item, status: 'cancelled' as BulkBgRemovalStatus }
          : item
      ),
    }));
  }, []);

  const flagItem = useCallback((id: string) => {
    updateItem(id, { flaggedForEdit: true });
  }, [updateItem]);

  const unflagItem = useCallback((id: string) => {
    updateItem(id, { flaggedForEdit: false });
  }, [updateItem]);

  const updateItemResult = useCallback((id: string, newUrl: string) => {
    updateItem(id, { editedUrl: newUrl, flaggedForEdit: false });
  }, [updateItem]);

  const markComplete = useCallback(() => {
    setState(prev => ({ ...prev, phase: 'complete' }));
  }, []);

  const retryFailed = useCallback(async () => {
    setState(prev => {
      const retryableItems = prev.items.filter(
        item =>
          item.status === 'failed' &&
          !item.error?.includes('Insufficient credits') &&
          !item.error?.includes('Authentication')
      );

      if (retryableItems.length === 0) return prev;

      return {
        ...prev,
        phase: 'processing' as BgRemovalQueuePhase,
        items: prev.items.map(item =>
          retryableItems.some(r => r.id === item.id)
            ? { ...item, status: 'queued' as BulkBgRemovalStatus, retryCount: 0, error: undefined, progress: 0 }
            : item
        ),
      };
    });

    await new Promise(r => setTimeout(r, 50));

    setState(prev => {
      const itemsToRetry = prev.items.filter(i => i.status === 'queued');
      if (itemsToRetry.length > 0) {
        cancelledRef.current = false;
        cancelledItemsRef.current.clear();
        throttledRef.current = false;
        concurrencyRef.current = DEFAULT_CONCURRENCY;
        activeWorkersRef.current = 0;
        consecutiveSuccessesRef.current = 0;

        runQueue(itemsToRetry).then(() => {
          setState(p => ({ ...p, phase: 'review' }));
        });
      }
      return prev;
    });
  }, [runQueue]);

  const completedItems = state.items.filter(i => i.status === 'complete');
  const failedItems = state.items.filter(i => i.status === 'failed');
  const flaggedItems = state.items.filter(i => i.flaggedForEdit && i.status === 'complete');
  const hasRetryableFailures = failedItems.some(
    i =>
      !i.error?.includes('Insufficient credits') &&
      !i.error?.includes('Authentication')
  );

  return {
    phase: state.phase,
    items: state.items,
    totalCreditsUsed: state.totalCreditsUsed,
    completedCount: completedItems.length,
    failedCount: failedItems.length,
    flaggedCount: flaggedItems.length,
    flaggedItems,
    hasRetryableFailures,
    startProcessing,
    cancelRemaining,
    cancelQueuedItem,
    retryFailed,
    flagItem,
    unflagItem,
    updateItemResult,
    updateItem,
    markComplete,
  };
}
