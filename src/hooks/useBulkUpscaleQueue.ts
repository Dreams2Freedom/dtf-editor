'use client';

import { useState, useCallback, useRef } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import {
  BulkImageItem,
  BulkImageStatus,
  isRetryableStatus,
} from '@/types/bulkUpscale';

const DEFAULT_CONCURRENCY = 2;
const THROTTLED_CONCURRENCY = 1;
const THROTTLE_DELAY_MS = 5000;
const RESTORE_AFTER_SUCCESSES = 3;

export type QueuePhase = 'idle' | 'processing' | 'complete' | 'halted';

interface QueueState {
  phase: QueuePhase;
  items: BulkImageItem[];
  totalCreditsUsed: number;
}

export function useBulkUpscaleQueue() {
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
    (id: string, updates: Partial<BulkImageItem>) => {
      setState(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.id === id ? { ...item, ...updates } : item
        ),
      }));
    },
    []
  );

  const uploadToStorage = useCallback(
    async (file: File, userId: string): Promise<string> => {
      const supabase = createClientSupabaseClient();
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const sanitizedName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_');
      const filePath = `users/${userId}/bulk-uploads/${timestamp}-${randomSuffix}-${sanitizedName}`;

      const { error } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (error) throw new Error(`Upload failed: ${error.message}`);

      const { data: urlData } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) throw new Error('Failed to get public URL');
      return urlData.publicUrl;
    },
    []
  );

  const processOneImage = useCallback(
    async (item: BulkImageItem): Promise<void> => {
      const supabase = createClientSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'anonymous';

      // Step 1: Upload to Supabase Storage
      updateItem(item.id, { status: 'uploading', progress: 10 });

      let storageUrl: string;
      try {
        storageUrl = await uploadToStorage(item.file, userId);
      } catch (err: any) {
        throw new Error(`Upload failed: ${err.message}`);
      }

      updateItem(item.id, { status: 'processing', progress: 30 });

      // Step 2: Call /api/upscale with the storage URL
      const formData = new FormData();
      formData.append('imageUrl', storageUrl);
      formData.append('processingMode', item.processingMode);
      formData.append('targetWidth', item.targetWidthPx.toString());
      formData.append('targetHeight', item.targetHeightPx.toString());

      // Use local variable for progress to avoid stale closure
      let currentProgress = 30;
      const progressInterval = setInterval(() => {
        currentProgress = Math.min(90, currentProgress + Math.random() * 5);
        updateItem(item.id, { progress: currentProgress });
      }, 2000);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        const response = await fetch('/api/upscale', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        clearInterval(progressInterval);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(
            errorData.error || `Upscale failed (${response.status})`
          );
          (error as any).httpStatus = response.status;
          throw error;
        }

        const data = await response.json();

        updateItem(item.id, {
          status: 'complete',
          progress: 100,
          resultUrl: data.url,
          imageId: data.imageId,
        });

        setState(prev => ({
          ...prev,
          totalCreditsUsed: prev.totalCreditsUsed + (data.creditsUsed || 1),
        }));
      } catch (err) {
        clearInterval(progressInterval);
        throw err;
      }
    },
    [updateItem, uploadToStorage]
  );

  const processWithRetry = useCallback(
    async (item: BulkImageItem): Promise<void> => {
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

        // Non-retryable: insufficient credits — halt entire queue
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

        // Non-retryable errors (400, 401)
        if (httpStatus && !isRetryableStatus(httpStatus)) {
          updateItem(item.id, {
            status: 'failed',
            error: err.message,
            progress: 0,
          });
          return;
        }

        // Rate limited — throttle down
        if (httpStatus === 429) {
          throttledRef.current = true;
          concurrencyRef.current = THROTTLED_CONCURRENCY;
          consecutiveSuccessesRef.current = 0;
        }

        // Retryable — retry once (in-place, does not release slot)
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

  // Worker loop that respects dynamic concurrency changes
  const runQueue = useCallback(
    async (queuedItems: BulkImageItem[]) => {
      let nextIndex = 0;
      const totalItems = queuedItems.length;

      const processNext = async (workerId: number): Promise<void> => {
        while (nextIndex < totalItems && !cancelledRef.current) {
          // If concurrency was reduced, excess workers exit
          if (workerId >= concurrencyRef.current) {
            activeWorkersRef.current--;
            return;
          }

          const currentIndex = nextIndex++;
          if (currentIndex >= totalItems) break;

          const item = queuedItems[currentIndex];

          // Skip individually cancelled items
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

      // Launch initial workers
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
    async (items: BulkImageItem[]) => {
      cancelledRef.current = false;
      cancelledItemsRef.current.clear();
      throttledRef.current = false;
      concurrencyRef.current = DEFAULT_CONCURRENCY;
      activeWorkersRef.current = 0;
      consecutiveSuccessesRef.current = 0;

      // Mark all as queued
      const queuedItems = items.map(item => ({
        ...item,
        status: 'queued' as BulkImageStatus,
        progress: 0,
        retryCount: 0,
        error: undefined,
        resultUrl: undefined,
        imageId: undefined,
      }));

      setState({ phase: 'processing', items: queuedItems, totalCreditsUsed: 0 });

      await runQueue(queuedItems);

      if (!cancelledRef.current) {
        setState(prev => ({ ...prev, phase: 'complete' }));
      }
    },
    [runQueue]
  );

  const cancelRemaining = useCallback(() => {
    cancelledRef.current = true;
    setState(prev => ({
      ...prev,
      phase: 'complete',
      items: prev.items.map(item =>
        item.status === 'queued'
          ? { ...item, status: 'cancelled' as BulkImageStatus }
          : item
      ),
    }));
  }, []);

  // Track cancelled items in a ref so the worker loop can check
  const cancelQueuedItem = useCallback((id: string) => {
    cancelledItemsRef.current.add(id);
    setState(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === id && item.status === 'queued'
          ? { ...item, status: 'cancelled' as BulkImageStatus }
          : item
      ),
    }));
  }, []);

  // Retry failed items WITHOUT replacing the full state
  const retryFailed = useCallback(async () => {
    setState(prev => {
      const retryableItems = prev.items.filter(
        item =>
          item.status === 'failed' &&
          !item.error?.includes('Insufficient credits') &&
          !item.error?.includes('Authentication')
      );

      if (retryableItems.length === 0) return prev;

      // Reset failed items to queued, keep everything else
      return {
        ...prev,
        phase: 'processing' as QueuePhase,
        items: prev.items.map(item =>
          retryableItems.some(r => r.id === item.id)
            ? { ...item, status: 'queued' as BulkImageStatus, retryCount: 0, error: undefined, progress: 0 }
            : item
        ),
      };
    });

    // Wait for state to settle then process
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
          setState(p => ({ ...p, phase: 'complete' }));
        });
      }
      return prev;
    });
  }, [runQueue]);

  const completedItems = state.items.filter(i => i.status === 'complete');
  const failedItems = state.items.filter(i => i.status === 'failed');
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
    hasRetryableFailures,
    startProcessing,
    cancelRemaining,
    cancelQueuedItem,
    retryFailed,
    updateItem,
  };
}
