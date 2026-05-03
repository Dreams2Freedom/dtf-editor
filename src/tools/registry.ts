/**
 * Studio Tool Registry (Phase 2.0)
 *
 * Ordered list of all tools available inside the Studio. The Studio shell
 * iterates over this to render the tool-picker pill row and to look up
 * the active tool's Panel component.
 *
 * Adding a new tool:
 *   1. Create src/tools/<tool-id>/ with a Panel and an index.ts that
 *      exports a `StudioTool` descriptor.
 *   2. Import it here and append to the array.
 *   3. Add the tool's id to the StudioToolId union in ./types.ts.
 *
 * That's it — no Studio shell changes.
 *
 * Tools are added incrementally during the Phase 2.0 migration:
 *   - bg-removal:    Step 2 (moved from src/components/studio/BackgroundRemovalPanel.tsx)
 *   - color-change:  Step 3 (moved from src/components/image/ColorChangeEditor.tsx)
 *   - upscale:       Step 4 (built from src/app/process/upscale/client.tsx logic)
 */

import type { StudioTool, StudioToolId } from './types';

import { bgRemovalTool } from './bg-removal';
import { colorChangeTool } from './color-change';
import { upscaleTool } from './upscale';
import { vectorizeTool } from './vectorize';
import { halftoneTool } from './halftone';

export const STUDIO_TOOLS: StudioTool[] = [
  bgRemovalTool,
  upscaleTool,
  colorChangeTool,
  vectorizeTool,
  halftoneTool,
];

export function getStudioTool(id: StudioToolId): StudioTool | undefined {
  return STUDIO_TOOLS.find(t => t.id === id);
}
