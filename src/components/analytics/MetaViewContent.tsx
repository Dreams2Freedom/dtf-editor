'use client';

import { useEffect, useRef } from 'react';
import { metaTrack } from '@/lib/meta/trackClient';

/**
 * Fires a Meta `ViewContent` event once when this marker scrolls into view
 * (Pixel + Conversions API, deduped by a shared event id). Drop it inside a
 * section you want to count as "viewed" — e.g. the pricing block. On a
 * dedicated page it's in view on load, so it fires immediately.
 */
export function MetaViewContent({
  contentName,
  contentCategory,
}: {
  contentName: string;
  contentCategory?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || firedRef.current) return;

    const fire = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      metaTrack('ViewContent', {
        customData: {
          content_name: contentName,
          ...(contentCategory ? { content_category: contentCategory } : {}),
        },
      });
    };

    // Guard for environments without IntersectionObserver — just fire.
    if (typeof IntersectionObserver === 'undefined') {
      fire();
      return;
    }

    const obs = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            fire();
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [contentName, contentCategory]);

  return <span ref={ref} aria-hidden style={{ display: 'block', height: 0 }} />;
}
