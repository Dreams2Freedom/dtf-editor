'use client';

/**
 * Vectorize tool — Studio plugin entry point (Phase 2.1).
 *
 * Mirrors the Upscale plugin pattern: thin wrapper around an external
 * API (Vectorizer.ai) with provider abstraction so swapping APIs is a
 * one-line registry change.
 */

import { Zap } from 'lucide-react';

import { VectorizePanel } from './Panel';
import type { StudioTool } from '../types';

export { VectorizePanel } from './Panel';
export * from './providers/types';
export { vectorizerAiProvider } from './providers/vectorizerAi';

export const vectorizeTool: StudioTool = {
  id: 'vectorize',
  label: 'Vectorize',
  icon: Zap,
  description:
    'Convert raster image to scalable vector (SVG). Powered by Vectorizer.ai.',
  gate: { credits: 2 },
  Panel: VectorizePanel,
};
