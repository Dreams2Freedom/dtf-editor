'use client';

import { useEffect } from 'react';

/**
 * Scrolls to the section matching the current URL hash on the landing page.
 *
 * Next's App Router does not reliably scroll to a hash when you navigate to it
 * from another route (e.g. clicking "FAQ" → /#faq from /terms), and the landing
 * sections render progressively. This handler runs on mount (cross-page arrival)
 * and on hashchange (same-page nav), retries until the target section exists,
 * and offsets for the sticky header so the section isn't hidden beneath it.
 */
export function HashScroll() {
  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash;
      if (!hash || hash === '#top') return;
      const id = decodeURIComponent(hash.slice(1));

      let tries = 0;
      const attempt = () => {
        const el = document.getElementById(id);
        if (el) {
          const header = document.querySelector('header');
          const offset = header
            ? header.getBoundingClientRect().height + 12
            : 0;
          const y = el.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top: y, behavior: 'smooth' });
          return;
        }
        // Section may not be rendered yet — retry briefly.
        if (tries++ < 20) setTimeout(attempt, 100);
      };
      // Small delay so the landing sections have a chance to mount first.
      setTimeout(attempt, 50);
    };

    scrollToHash();
    window.addEventListener('hashchange', scrollToHash);
    return () => window.removeEventListener('hashchange', scrollToHash);
  }, []);

  return null;
}
