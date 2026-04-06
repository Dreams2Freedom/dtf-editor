'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { BulkFileSelector } from './bulk/BulkFileSelector';
import { BulkSettingsTable } from './bulk/BulkSettingsTable';
import { BulkProgressTable } from './bulk/BulkProgressTable';
import { BulkResultsSummary } from './bulk/BulkResultsSummary';
import { useBulkUpscaleQueue } from '@/hooks/useBulkUpscaleQueue';
import { BulkImageItem } from '@/types/bulkUpscale';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { CreditCard } from 'lucide-react';

export function BulkUpscaleTool() {
  const [pendingItems, setPendingItems] = useState<BulkImageItem[]>([]);
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(true);

  const queue = useBulkUpscaleQueue();

  // Warn user before navigating away during processing
  useEffect(() => {
    if (queue.phase !== 'processing') return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [queue.phase]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      pendingItems.forEach(item => URL.revokeObjectURL(item.previewUrl));
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch user credits on mount
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const supabase = createClientSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('profiles')
          .select('credits_remaining')
          .eq('id', user.id)
          .single();

        setUserCredits(data?.credits_remaining ?? 0);
      } catch {
        setUserCredits(0);
      } finally {
        setCreditsLoading(false);
      }
    };

    fetchCredits();
  }, []);

  const handleFilesSelected = useCallback((newItems: BulkImageItem[]) => {
    setPendingItems(prev => [...prev, ...newItems]);
  }, []);

  const handleUpdateItem = useCallback((id: string, updates: Partial<BulkImageItem>) => {
    setPendingItems(prev =>
      prev.map(item => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setPendingItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  }, []);

  const allConfigured = pendingItems.length > 0 &&
    pendingItems.every(item => item.targetWidthPx > 0 && item.targetHeightPx > 0);

  const hasEnoughCredits =
    userCredits !== null && pendingItems.length <= userCredits;

  const canProcess = allConfigured && hasEnoughCredits;

  const handleProcessAll = () => {
    if (!canProcess) return;
    queue.startProcessing(pendingItems);
  };

  // Render based on queue phase
  if (queue.phase === 'processing') {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">
          Bulk Upscaling in Progress
        </h2>
        <BulkProgressTable
          items={queue.items}
          onCancelItem={queue.cancelQueuedItem}
          onCancelAll={queue.cancelRemaining}
          isProcessing
        />
      </div>
    );
  }

  if (queue.phase === 'complete' || queue.phase === 'halted') {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">
          Bulk Upscaling {queue.phase === 'halted' ? 'Stopped' : 'Complete'}
        </h2>
        <BulkProgressTable
          items={queue.items}
          onCancelItem={() => {}}
          onCancelAll={() => {}}
          isProcessing={false}
        />
        <BulkResultsSummary
          items={queue.items}
          totalCreditsUsed={queue.totalCreditsUsed}
          hasRetryableFailures={queue.hasRetryableFailures}
          onRetryFailed={queue.retryFailed}
          isHalted={queue.phase === 'halted'}
        />
      </div>
    );
  }

  // Idle phase — settings UI
  return (
    <div className="space-y-6">
      <BulkFileSelector
        onFilesSelected={handleFilesSelected}
        currentCount={pendingItems.length}
      />

      {pendingItems.length > 0 && (
        <>
          {/* Credit check banner */}
          <div
            className={`p-4 rounded-lg border flex items-start gap-3 ${
              hasEnoughCredits
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <CreditCard
              className={`w-5 h-5 mt-0.5 ${
                hasEnoughCredits ? 'text-green-600' : 'text-red-600'
              }`}
            />
            <div>
              {creditsLoading ? (
                <p className="text-sm text-gray-600">Checking credits...</p>
              ) : hasEnoughCredits ? (
                <p className="text-sm text-green-800">
                  <strong>{pendingItems.length} images</strong> selected —{' '}
                  {pendingItems.length} credits required. You have{' '}
                  <strong>{userCredits}</strong> credits available.
                </p>
              ) : (
                <div>
                  <p className="text-sm text-red-800 font-medium">
                    Insufficient credits
                  </p>
                  <p className="text-sm text-red-600">
                    You have {userCredits} credits but need{' '}
                    {pendingItems.length}. Remove {pendingItems.length - (userCredits ?? 0)}{' '}
                    image(s) or{' '}
                    <a
                      href="/pricing"
                      className="underline font-medium hover:text-red-700"
                    >
                      purchase more credits
                    </a>
                    .
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Settings table */}
          <BulkSettingsTable
            items={pendingItems}
            onUpdateItem={handleUpdateItem}
            onRemoveItem={handleRemoveItem}
          />

          {/* Process All button */}
          <button
            onClick={handleProcessAll}
            disabled={!canProcess}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-lg text-xl shadow-lg transform hover:scale-105 disabled:hover:scale-100 transition-all duration-200"
          >
            {canProcess
              ? `Process All (${pendingItems.length} credits)`
              : !allConfigured
                ? 'Configure print sizes for all images'
                : 'Insufficient credits'}
          </button>
        </>
      )}
    </div>
  );
}
