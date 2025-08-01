'use client';

import { useEffect } from 'react';

export function GlobalErrorHandler() {
  useEffect(() => {
    // Suppress all errors in development to prevent overlay
    if (process.env.NODE_ENV === 'development') {
      window.addEventListener('error', (e) => {
        e.preventDefault();
        console.warn('Suppressed error:', e.error);
      });

      window.addEventListener('unhandledrejection', (e) => {
        e.preventDefault();
        console.warn('Suppressed promise rejection:', e.reason);
      });
    }
  }, []);

  return null;
}