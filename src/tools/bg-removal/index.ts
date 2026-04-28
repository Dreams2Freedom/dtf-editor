/**
 * BG Removal tool — Studio plugin entry point.
 *
 * Phase 2.0 Step 5: introduces the StudioToolPanelProps adapter so the
 * existing BackgroundRemovalPanel (whose props were designed before
 * the plugin contract existed) can mount inside the new plugin-driven
 * Studio shell without touching its 1700+ lines of internal logic.
 */

import { useCallback } from 'react';
import { Wand2 } from 'lucide-react';

import { BackgroundRemovalPanel } from './Panel';
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

/**
 * Adapter: maps the legacy `onSave(canvas, provider)` signature to the
 * Studio plugin contract's `onApply(canvas, meta)`. The Studio shell
 * decides what to do with the canvas (chain into the next tool, save
 * to gallery, etc.) — adapter just shuttles the data across.
 */
function BgRemovalToolPanel(props: StudioToolPanelProps) {
  const { image, imageId, onApply, onCancel } = props;

  const handleSave = useCallback(
    async (canvas: HTMLCanvasElement, provider: 'in-house') => {
      onApply(canvas, {
        operation: 'background_removal_in_house',
        provider,
      });
    },
    [onApply]
  );

  const advancedBgUrl = imageId
    ? `/process/background-removal?imageId=${imageId}`
    : '/process/background-removal';

  return (
    <BackgroundRemovalPanel
      image={image}
      onSave={handleSave}
      onCancel={onCancel ?? (() => undefined)}
      savedImageId={null}
      advancedBgUrl={advancedBgUrl}
    />
  );
}

export const bgRemovalTool: StudioTool = {
  id: 'bg-removal',
  label: 'Background Removal',
  icon: Wand2,
  description:
    'Remove or refine the background of your image with AI Brush, color picker, or AI-only modes.',
  Panel: BgRemovalToolPanel,
};
