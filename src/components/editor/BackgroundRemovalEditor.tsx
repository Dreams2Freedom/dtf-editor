'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useSAM2 } from '@/hooks/useSAM2';
import { EditorToolbar } from './EditorToolbar';
import { EditorCanvas } from './EditorCanvas';
import { MaskPreview } from './MaskPreview';
import { maskToBase64 } from '@/lib/sam2/mask-utils';
import { featherMask } from '@/lib/sam2/mask-utils';
import { Button } from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';
import type { ToolMode, PointPrompt } from '@/lib/sam2/types';

interface BackgroundRemovalEditorProps {
  imageUrl: string;
  imageFile?: File;
  onComplete: (result: { processedUrl: string; imageId: string }) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

/**
 * Main SAM2 background removal editor component.
 * Orchestrates encoding, interactive editing, and final mask application.
 */
export function BackgroundRemovalEditor({
  imageUrl,
  imageFile,
  onComplete,
  onCancel,
  onError,
}: BackgroundRemovalEditorProps) {
  const [toolMode, setToolMode] = useState<ToolMode>('keep');
  const [featherRadius, setFeatherRadius] = useState(0);
  const [isApplying, setIsApplying] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Preparing AI model...');

  // Canvas dimensions (needed for decoder calls)
  const canvasDimsRef = useRef({ width: 512, height: 512 });

  const {
    encoderStatus,
    decoderStatus,
    currentMask,
    points,
    isProcessing,
    encodeImage,
    addPoint,
    undoPoint,
    clearPoints,
    autoSegment,
  } = useSAM2({
    onEncoderReady: () => {
      setStatusMessage('Loading AI decoder...');
    },
    onDecoderReady: () => {
      setStatusMessage('');
    },
    onError: err => {
      setStatusMessage('');
      onError(err);
    },
  });

  // Start encoding when the component mounts
  const hasStartedRef = useRef(false);
  React.useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const startEncoding = async () => {
      let file = imageFile;
      if (!file && imageUrl) {
        // Fetch the image URL and create a File object
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          file = new File([blob], 'image.png', { type: blob.type });
        } catch {
          onError('Failed to load the image');
          return;
        }
      }
      if (file) {
        await encodeImage(file);
      }
    };

    startEncoding();
  }, [imageUrl, imageFile, encodeImage, onError]);

  // Auto-segment when both encoder and decoder are ready
  const hasAutoSegmentedRef = useRef(false);
  React.useEffect(() => {
    if (
      encoderStatus === 'ready' &&
      decoderStatus === 'ready' &&
      !hasAutoSegmentedRef.current
    ) {
      hasAutoSegmentedRef.current = true;
      const { width, height } = canvasDimsRef.current;
      autoSegment(width, height);
    }
  }, [encoderStatus, decoderStatus, autoSegment]);

  // Update canvas dimensions from the loaded image
  const handleImageLoad = useCallback(() => {
    // The EditorCanvas will set its own dimensions; we need to track them
    // for decoder calls. We'll use a reasonable default based on the image.
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const maxDim = 512;
      const scale = Math.min(
        maxDim / img.naturalWidth,
        maxDim / img.naturalHeight,
        1
      );
      canvasDimsRef.current = {
        width: Math.round(img.naturalWidth * scale),
        height: Math.round(img.naturalHeight * scale),
      };
    };
    img.src = imageUrl;
  }, [imageUrl]);

  React.useEffect(() => {
    handleImageLoad();
  }, [handleImageLoad]);

  // Handle adding a point
  const handlePointAdd = useCallback(
    (point: PointPrompt) => {
      const { width, height } = canvasDimsRef.current;
      addPoint(point, width, height);
    },
    [addPoint]
  );

  // Handle undo
  const handleUndo = useCallback(() => {
    const { width, height } = canvasDimsRef.current;
    undoPoint(width, height);
  }, [undoPoint]);

  // Handle reset
  const handleReset = useCallback(() => {
    const { width, height } = canvasDimsRef.current;
    clearPoints(width, height);
  }, [clearPoints]);

  // Apply mask and save
  const handleApply = useCallback(async () => {
    if (!currentMask) return;

    setIsApplying(true);
    setStatusMessage('Applying mask and saving...');

    try {
      // Feather the mask if needed before sending to server
      const finalMask =
        featherRadius > 0
          ? featherMask(currentMask, featherRadius)
          : currentMask;

      // Serialize mask to base64
      const maskBase64 = maskToBase64(finalMask);

      // Send to server for full-res processing
      const response = await fetch('/api/sam2/apply-mask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          mask: maskBase64,
          maskWidth: finalMask.width,
          maskHeight: finalMask.height,
          featherRadius,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      // Get the result image as blob
      const blob = await response.blob();
      const processedUrl = URL.createObjectURL(blob);
      const imageId = response.headers.get('X-Image-Id') || '';

      onComplete({ processedUrl, imageId });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to apply mask';
      onError(message);
    } finally {
      setIsApplying(false);
      setStatusMessage('');
    }
  }, [currentMask, featherRadius, imageUrl, onComplete, onError]);

  const isLoading = encoderStatus === 'loading' || decoderStatus === 'loading';
  const isReady = encoderStatus === 'ready' && decoderStatus === 'ready';
  const hasError = encoderStatus === 'error' || decoderStatus === 'error';

  return (
    <div className="space-y-4">
      {/* Status bar */}
      {(isLoading || statusMessage) && !hasError && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>
            {statusMessage ||
              (encoderStatus === 'loading'
                ? 'Analyzing image with AI (this may take a few seconds)...'
                : 'Loading AI model...')}
          </span>
        </div>
      )}

      {hasError && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to initialize AI model. Please try again.
        </div>
      )}

      {/* Toolbar */}
      <EditorToolbar
        toolMode={toolMode}
        onToolModeChange={setToolMode}
        featherRadius={featherRadius}
        onFeatherChange={setFeatherRadius}
        onUndo={handleUndo}
        canUndo={points.length > 0}
        onReset={handleReset}
        disabled={!isReady || isApplying}
      />

      {/* Editor panes */}
      <div className="flex flex-col md:flex-row gap-4">
        <EditorCanvas
          imageUrl={imageUrl}
          points={points}
          toolMode={toolMode}
          onPointAdd={handlePointAdd}
          mask={currentMask}
          disabled={!isReady || isApplying}
        />
        <MaskPreview
          imageUrl={imageUrl}
          mask={currentMask}
          isProcessing={isProcessing}
        />
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel} disabled={isApplying}>
          Cancel
        </Button>
        <Button
          variant="default"
          onClick={handleApply}
          loading={isApplying}
          disabled={!currentMask || !isReady || isApplying}
        >
          Apply &amp; Save
        </Button>
      </div>
    </div>
  );
}
