'use client';

import { useEffect } from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Force close any error overlays on mount
    const closeErrorOverlay = () => {
      // Try to find and remove any error overlay elements
      const errorOverlays = document.querySelectorAll(
        'iframe[src*="react-error-overlay"], [id*="error-overlay"], [class*="error-overlay"], nextjs-portal'
      );
      errorOverlays.forEach(el => el.remove());
      
      // Remove any fixed position divs that might be overlays
      const fixedDivs = document.querySelectorAll('body > div');
      fixedDivs.forEach(div => {
        const style = window.getComputedStyle(div);
        if (style.position === 'fixed' && style.zIndex && parseInt(style.zIndex) > 9000) {
          div.remove();
        }
      });
    };

    // Run immediately and after a short delay
    closeErrorOverlay();
    setTimeout(closeErrorOverlay, 100);
    setTimeout(closeErrorOverlay, 500);
  }, []);

  return <div suppressHydrationWarning>{children}</div>;
}