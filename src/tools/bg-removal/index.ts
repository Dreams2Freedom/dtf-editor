/**
 * BG Removal tool — Studio plugin entry point.
 *
 * Phase 2.0 Step 2: this file currently re-exports the existing
 * BackgroundRemovalPanel component as-is. A subsequent step (Step 5,
 * Studio shell rewrite) will introduce an adapter that converts the
 * panel's `onSave(canvas, provider)` signature into the plugin
 * contract's `onApply(canvas, meta)`. Until then, the panel keeps its
 * current `BackgroundRemovalPanelProps` shape.
 *
 * IMPORTANT: when registering this tool in src/tools/registry.ts after
 * the Studio shell rewrite, wrap `Panel` in an adapter that provides
 * the StudioToolPanelProps interface.
 */

import { Wand2 } from 'lucide-react';

import { BackgroundRemovalPanel } from './Panel';
import type { StudioTool } from '../types';

// Re-exported for the existing Studio client.tsx; remove once the
// shell rewrite (Step 5) is in.
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
 * Studio tool descriptor. Registered in src/tools/registry.ts once the
 * Studio shell adopts the plugin contract (Step 5). The Panel field
 * here is intentionally typed as `any` for now because the underlying
 * BackgroundRemovalPanel still uses its legacy props shape — Step 5
 * adds the adapter component.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const bgRemovalTool: StudioTool = {
  id: 'bg-removal',
  label: 'Background Removal',
  icon: Wand2,
  description:
    'Remove or refine the background of your image with AI Brush, color picker, or AI-only modes.',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Panel: BackgroundRemovalPanel as any,
};
