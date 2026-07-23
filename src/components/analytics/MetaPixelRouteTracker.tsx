'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

import { metaTrack } from '@/lib/meta/trackClient';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Fires a Meta Pixel `PageView` on client-side (SPA) route changes.
 *
 * The root layout's inline pixel loader already fires the first `PageView`
 * on initial page load, so this skips the first render to avoid
 * double-counting it. Subsequent App Router navigations (which don't reload
 * the page) then each get their own `PageView`.
 *
 * Tracks on pathname only — not query-string changes — so in-page URL updates
 * (e.g. Studio's `?tool=` switches) don't inflate the pageview count.
 */
export function MetaPixelRouteTracker() {
  const pathname = usePathname();
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    // Fire PageView on both the Pixel and the Conversions API (shared event id
    // → Meta deduplicates the pair).
    metaTrack('PageView');
  }, [pathname]);

  return null;
}
