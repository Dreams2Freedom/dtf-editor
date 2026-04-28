'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { BulkFileSelector } from './bulk/BulkFileSelector';
import { BulkBgRemovalFileList } from './bulk/BulkBgRemovalFileList';
import { BulkBgRemovalReviewTable } from './bulk/BulkBgRemovalReviewTable';
import { BulkBgRemovalEditModal } from './bulk/BulkBgRemovalEditModal';
import { useBulkBgRemovalQueue } from '@/hooks/useBulkBgRemovalQueue';
import { BulkBgRemovalItem } from '@/types/bulkBgRemoval';
import { BulkImageItem } from '@/types/bulkUpscale';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { CreditCard } from 'lucide-react';

// BulkProgressTable uses BulkImageItem — we adapt our items for it
import { BulkProgressTable } from './bulk/BulkProgressTable';

/** Convert BulkImageItem from file selector to BulkBgRemovalItem */
function toBgRemovalItem(item: BulkImageItem): BulkBgRemovalItem {
  return {
    id: item.id,
    file: item.file,
    previewUrl: item.previewUrl,
    filename: item.filename,
    fileSizeBytes: item.fileSizeBytes,
    originalWidth: item.originalWidth,
    originalHeight: item.originalHeight,
    status: 'pending',
    progress: 0,
    retryCount: 0,
    originalPreviewUrl: item.previewUrl,
    flaggedForEdit: false,
  };
}

/** Convert BulkBgRemovalItem to BulkImageItem for BulkProgressTable compatibility */
function toProgressTableItem(item: BulkBgRemovalItem): BulkImageItem {
  return {
    id: item.id,
    file: item.file,
    previewUrl: item.previewUrl,
    filename: item.filename,
    fileSizeBytes: item.fileSizeBytes,
    originalWidth: item.originalWidth,
    originalHeight: item.originalHeight,
    presetIndex: 0,
    customWidthInches: 0,
    customHeightInches: 0,
    targetWidthPx: item.originalWidth,
    targetHeightPx: item.originalHeight,
    processingMode: 'auto_enhance',
    status: item.status as any,
    progress: item.progress,
    error: item.error,
    retryCount: item.retryCount,
    resultUrl: item.resultUrl,
    imageId: item.imageId,
  };
}

export function BulkBgRemovalTool() {
  const [pendingItems, setPendingItems] = useState<BulkBgRemovalItem[]>([]);
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  const queue = useBulkBgRemovalQueue();

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
    setPendingItems(prev => [...prev, ...newItems.map(toBgRemovalItem)]);
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setPendingItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  }, []);

  const hasEnoughCredits =
    userCredits !== null && pendingItems.length <= userCredits;

  const canProcess = pendingItems.length > 0 && hasEnoughCredits;

  const handleProcessAll = () => {
    if (!canProcess) return;
    queue.startProcessing(pendingItems);
  };

  const handleItemEdited = useCallback(
    (id: string, newUrl: string) => {
      queue.updateItemResult(id, newUrl);
    },
    [queue]
  );

  const handleReEditFlagged = () => {
    setShowEditModal(true);
  };

  // Processing phase — show progress table
  if (queue.phase === 'processing') {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">
          Bulk Background Removal in Progress
        </h2>
        <BulkProgressTable
          items={queue.items.map(toProgressTableItem)}
          onCancelItem={queue.cancelQueuedItem}
          onCancelAll={queue.cancelRemaining}
          isProcessing
        />
      </div>
    );
  }

  // Review / Complete / Halted phase — show review table
  if (
    queue.phase === 'review' ||
    queue.phase === 'complete' ||
    queue.phase === 'halted'
  ) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">
          Bulk Background Removal{' '}
          {queue.phase === 'halted'
            ? 'Stopped'
            : queue.phase === 'complete'
              ? 'Complete'
              : 'Review'}
        </h2>

        <BulkBgRemovalReviewTable
          items={queue.items}
          totalCreditsUsed={queue.totalCreditsUsed}
          flaggedCount={queue.flaggedCount}
          hasRetryableFailures={queue.hasRetryableFailures}
          onRetryFailed={queue.retryFailed}
          onFlagItem={queue.flagItem}
          onUnflagItem={queue.unflagItem}
          onReEditFlagged={handleReEditFlagged}
          isHalted={queue.phase === 'halted'}
        />

        {showEditModal && queue.flaggedItems.length > 0 && (
          <BulkBgRemovalEditModal
            flaggedItems={queue.flaggedItems}
            onItemEdited={handleItemEdited}
            onClose={() => setShowEditModal(false)}
          />
        )}
      </div>
    );
  }

  // Idle phase — file selection
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
                    {pendingItems.length}. Remove{' '}
                    {pendingItems.length - (userCredits ?? 0)} image(s) or{' '}
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

          {/* File list */}
          <BulkBgRemovalFileList
            items={pendingItems}
            onRemoveItem={handleRemoveItem}
          />

          {/* Process All button */}
          <button
            onClick={handleProcessAll}
            disabled={!canProcess}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-lg text-xl shadow-lg transform hover:scale-105 disabled:hover:scale-100 transition-all duration-200"
          >
            {canProcess
              ? `Remove Backgrounds (${pendingItems.length} credits)`
              : pendingItems.length === 0
                ? 'Select images to process'
                : 'Insufficient credits'}
          </button>
        </>
      )}
    </div>
  );
}
