/**
 * Color Change tool — Studio plugin entry point.
 *
 * Phase 2.0 Step 3: re-exports the existing ColorChangeEditor as-is
 * plus its types/hook so legacy callers still work. The Studio shell
 * rewrite (Step 5) introduces an adapter that converts the editor's
 * existing prop shape into the StudioToolPanelProps contract.
 */

import { Palette } from 'lucide-react';

import { ColorChangeEditor } from './Panel';
import type { StudioTool } from '../types';

// Re-exports for callers that still use the legacy named imports.
// Removed once the Studio shell rewrite (Step 5) lands.
export { ColorChangeEditor } from './Panel';
export * from './types';
export { useColorChangeHistory } from './useColorChangeHistory';

/**
 * Studio tool descriptor. The Panel field is intentionally typed as
 * `any` because the underlying ColorChangeEditor still has its legacy
 * props shape (image / onSave / onCancel / etc.). Step 5 wraps it in
 * an adapter providing StudioToolPanelProps.
 */
export const colorChangeTool: StudioTool = {
  id: 'color-change',
  label: 'Color Change',
  icon: Palette,
  description: 'Replace one color in your image with another using lasso or click selection.',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Panel: ColorChangeEditor as any,
};
