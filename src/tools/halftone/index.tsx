'use client';

/**
 * Halftone tool — Studio plugin entry point (Phase 2.2).
 *
 * Pure-client pixel work via @thi.ng/pixel-dither, plus a tier-gated
 * /api/halftone/use call that decides whether the operation is free
 * (paid plan, within monthly free quota) or charges 1 credit.
 *
 * The adapter mirrors the color-change pattern: it owns the
 * StudioToolPanelProps contract and hands the Panel a typed `onCommit`
 * that internally calls the gating endpoint, so the Panel itself stays
 * Supabase-free.
 */

import { useCallback } from 'react';
import { Grid3x3 } from 'lucide-react';

import { HalftonePanel } from './Panel';
import type { StudioTool, StudioToolPanelProps } from '../types';

interface UsageResponse {
  allowed: boolean;
  remaining: number;
  limit?: number;
  creditCharged: boolean;
  error?: string;
}

function HalftoneToolPanel(props: StudioToolPanelProps) {
  const { onApply: _onApply } = props;

  const handleCommit = useCallback(async (_canvas: HTMLCanvasElement) => {
    const res = await fetch('/api/halftone/use', {
      method: 'POST',
      credentials: 'include',
    });
    const data: UsageResponse = await res.json();
    if (!res.ok || !data.allowed) {
      throw new Error(
        data.error ||
          'Out of free halftones for this month and out of credits. ' +
            'Upgrade or buy credits to continue.'
      );
    }
    return {
      remaining: data.remaining,
      limit: data.limit ?? 0,
      creditCharged: data.creditCharged,
    };
  }, []);

  return <HalftonePanel {...props} onCommit={handleCommit} />;
}

export const halftoneTool: StudioTool = {
  id: 'halftone',
  label: 'Halftone',
  icon: Grid3x3,
  description:
    'DTF-ready halftone — transparent PNG of black dots. Free on Starter+ plans.',
  Panel: HalftoneToolPanel,
};

export { HalftonePanel } from './Panel';
export * from './types';
export { thingDitherProvider } from './providers/thingDither';
