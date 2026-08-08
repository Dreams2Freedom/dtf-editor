/**
 * Upscale tool — Studio plugin entry point.
 *
 * Phase 2.0 Step 4. Unlike BG Removal and Color Change (which were
 * pre-existing components moved into src/tools/), the Upscale Panel is
 * a fresh implementation that conforms to StudioToolPanelProps from
 * day one. The original /process/upscale page stays untouched until
 * Step 6 thin-wraps it around this same Panel.
 */

import { Sparkles } from 'lucide-react';

import { UpscalePanel } from './Panel';
import type { StudioTool } from '../types';

export { UpscalePanel } from './Panel';
export * from './providers/types';
export { deepImageProvider } from './providers/deepImage';

export const upscaleTool: StudioTool = {
  id: 'upscale',
  label: 'Upscale',
  icon: Sparkles,
  description:
    'Increase image resolution 2× or 4× with AI enhancement (Deep-Image.ai).',
  gate: { credits: 1 },
  Panel: UpscalePanel,
};
