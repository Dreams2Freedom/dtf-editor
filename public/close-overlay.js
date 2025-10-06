// Emergency script to close error overlays
(function () {
  function closeAllOverlays() {
    // Remove React error overlay iframes
    document.querySelectorAll('iframe').forEach(iframe => {
      if (iframe.src && iframe.src.includes('react-error-overlay')) {
        iframe.remove();
      }
    });

    // Remove Next.js error overlay
    document.querySelectorAll('nextjs-portal, [id*="__next"]').forEach(el => {
      if (el.shadowRoot || el.style.zIndex > 9000) {
        el.remove();
      }
    });

    // Remove any fixed overlays
    document.querySelectorAll('body > div').forEach(div => {
      const style = window.getComputedStyle(div);
      if (style.position === 'fixed' && parseInt(style.zIndex) > 9000) {
        div.remove();
      }
    });

    // Remove by common error overlay classes
    const selectors = [
      '[class*="error-overlay"]',
      '[class*="ErrorOverlay"]',
      '[data-nextjs-dialog]',
      '[data-nextjs-errors]',
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => el.remove());
    });
  }

  // Run immediately
  closeAllOverlays();

  // Run on DOM ready
  if (document.readyState !== 'loading') {
    closeAllOverlays();
  } else {
    document.addEventListener('DOMContentLoaded', closeAllOverlays);
  }

  // Keep running every 100ms for 2 seconds to catch late-loading overlays
  let count = 0;
  const interval = setInterval(() => {
    closeAllOverlays();
    count++;
    if (count > 20) clearInterval(interval);
  }, 100);
})();
