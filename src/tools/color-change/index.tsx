'use client';

/**
 * Color Change tool — Studio plugin entry point.
 *
 * Phase 2.0 Step 5: introduces the StudioToolPanelProps adapter so the
 * existing ColorChangeEditor (whose props pre-date the plugin contract)
 * can mount inside the plugin-driven Studio shell.
 *
 * The adapter fetches the user's color-change usage limits internally
 * so individual tool callers don't have to plumb that state through.
 */

import { useCallback, useEffect, useState } from 'react';
import { Palette } from 'lucide-react';

import { ColorChangeEditor } from './Panel';
import type { StudioTool, StudioToolPanelProps } from '../types';
import { COLOR_CHANGE_LIMITS } from './types';
import { createClientSupabaseClient } from '@/lib/supabase/client';

// Re-exports for standalone callers and the legacy color-change API route.
export { ColorChangeEditor } from './Panel';
export * from './types';
export { useColorChangeHistory } from './useColorChangeHistory';

function useColorChangeUsage() {
  const [remaining, setRemaining] = useState(5);
  const [limit, setLimit] = useState(5);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClientSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('id', user.id)
          .single();
        if (cancelled) return;
        const tier = data?.subscription_status || 'free';
        const lim =
          (COLOR_CHANGE_LIMITS as Record<string, number>)[tier] ??
          COLOR_CHANGE_LIMITS.free;
        setLimit(lim);
        setRemaining(lim);
      } catch {
        /* fall back to defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return { remaining, limit, setRemaining };
}

function ColorChangeToolPanel(props: StudioToolPanelProps) {
  const { image, onApply, onCancel } = props;
  const { remaining, limit, setRemaining } = useColorChangeUsage();

  const handleSave = useCallback(
    async (canvas: HTMLCanvasElement) => {
      // Server-side usage gate (/api/color-change/use) tracks the tier quota
      // and charges past the free limit. FAIL CLOSED: if the gate call errors
      // or is rejected, do NOT apply — never hand over a limited/paid
      // operation for free.
      let useResult: {
        allowed: boolean;
        remaining: number;
        creditCharged?: boolean;
      };
      try {
        const r = await fetch('/api/color-change/use', {
          method: 'POST',
          credentials: 'include',
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(
            err?.error ??
              (r.status === 402
                ? 'No color changes remaining. Purchase credits or upgrade your plan.'
                : 'Could not verify your color-change allowance. Please try again.')
          );
        }
        useResult = await r.json();
      } catch (e) {
        throw e instanceof Error
          ? e
          : new Error('Could not apply color change. Please try again.');
      }
      if (!useResult.allowed) {
        throw new Error(
          'No color changes remaining. Purchase credits or upgrade your plan.'
        );
      }
      setRemaining(useResult.remaining);
      onApply(canvas, { operation: 'color_change' });
    },
    [onApply, setRemaining]
  );

  // Undo/Redo/Reset sync the canvas to Studio WITHOUT charging (only a real
  // Apply hits /api/color-change/use), so the exported image always matches
  // what the user sees.
  const handleCanvasUpdate = useCallback(
    (canvas: HTMLCanvasElement) => {
      onApply(canvas, { operation: 'color_change' });
    },
    [onApply]
  );

  return (
    <ColorChangeEditor
      image={image}
      usageRemaining={remaining}
      usageLimit={limit}
      onSave={handleSave}
      onCanvasUpdate={handleCanvasUpdate}
      onCancel={onCancel ?? (() => undefined)}
      savedImageId={null}
      onNavigate={() => undefined}
    />
  );
}

export const colorChangeTool: StudioTool = {
  id: 'color-change',
  label: 'Color Change',
  icon: Palette,
  description:
    'Replace one color in your image with another using lasso or click selection.',
  Panel: ColorChangeToolPanel,
};
