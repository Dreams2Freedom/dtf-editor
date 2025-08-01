'use client';

import { useEffect } from 'react';

export function ErrorSuppressor() {
  useEffect(() => {
    // Override console.error to suppress hydration errors
    const originalError = console.error;
    console.error = (...args) => {
      // Check if it's a hydration error
      const errorString = args.join(' ');
      if (
        errorString.includes('Hydration failed') ||
        errorString.includes('There was an error while hydrating') ||
        errorString.includes('Text content does not match server-rendered HTML')
      ) {
        // Suppress hydration errors
        console.warn('Suppressed hydration error:', errorString);
        return;
      }
      // Call original console.error for other errors
      originalError.apply(console, args);
    };

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('Hydration failed')) {
        event.preventDefault();
        console.warn('Suppressed unhandled hydration error');
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup
    return () => {
      console.error = originalError;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}