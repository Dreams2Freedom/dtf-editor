'use client';

/**
 * BG Removal tool — Studio plugin entry point.
 *
 * Phase 2.8: ClippingMagic is now the DEFAULT bg-removal experience.
 * The in-house panel (`BackgroundRemovalPanel`) is retained as a
 * secondary "backup" reachable via a button at the bottom of the CM
 * panel. The two panels share the StudioToolPanelProps surface; this
 * adapter is the only place that knows about the mode toggle.
 *
 * History:
 *   - Phase 2.0 introduced the StudioToolPanelProps adapter.
 *   - Phase 2.7 added stranded-component carving to the in-house panel.
 *   - Phase 2.8 (this) flipped the default to CM and demoted in-house.
 */

import { useCallback, useState } from 'react';
import { Wand2 } from 'lucide-react';

import { BackgroundRemovalPanel } from './Panel';
import { ClippingMagicPanel } from './ClippingMagicPanel';
import type { StudioTool, StudioToolPanelProps } from '../types';

// Re-exports kept for any standalone callers (e.g. /process/background-removal).
export { BackgroundRemovalPanel } from './Panel';
export * from './types';
export * from './api';
export {
  clientFloodFill,
  clientMultiFloodFill,
  samplePathPoints,
  useBackgroundRemoval,
} from './useBackgroundRemoval';

type Mode = 'cm' | 'inhouse';

function BgRemovalToolPanel(props: StudioToolPanelProps) {
  const { image, imageId, onApply, onCancel, registerPendingCommit } = props;
  const [mode, setMode] = useState<Mode>('cm');

  const handleInHouseSave = useCallback(
    async (canvas: HTMLCanvasElement, provider: 'in-house') => {
      onApply(canvas, {
        operation: 'background_removal_in_house',
        provider,
      });
    },
    [onApply]
  );

  if (mode === 'cm') {
    return (
      <ClippingMagicPanel
        {...props}
        onSwitchToInHouse={() => setMode('inhouse')}
      />
    );
  }

  return (
    <BackgroundRemovalPanel
      image={image}
      onSave={handleInHouseSave}
      onCancel={onCancel ?? (() => undefined)}
      savedImageId={imageId}
      onSwitchToCm={() => setMode('cm')}
      registerPendingCommit={registerPendingCommit}
    />
  );
}

export const bgRemovalTool: StudioTool = {
  id: 'bg-removal',
  label: 'Background Removal',
  icon: Wand2,
  description:
    'Remove or refine the background of your image with the ClippingMagic editor — or switch to our experimental in-house tool.',
  Panel: BgRemovalToolPanel,
};
