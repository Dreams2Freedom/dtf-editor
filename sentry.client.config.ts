// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // You can remove this option if you're not planning to use the Replay feature:
  replaysOnErrorSampleRate: 1.0,
  
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // You can exclude specific URLs from being captured
  ignoreErrors: [
    // Browser extensions
    "chrome-extension://",
    "moz-extension://",
    // Common network errors
    "Network request failed",
    "NetworkError",
    "Failed to fetch",
    // User canceled actions
    "User cancelled",
    "User denied",
    // ClippingMagic editor popups (expected behavior)
    "ResizeObserver loop limit exceeded",
  ],

  beforeSend(event, hint) {
    // Filter out certain errors in development
    if (process.env.NODE_ENV === "development") {
      // Don't send hydration errors in development
      if (hint.originalException?.toString?.()?.includes("Hydration")) {
        return null;
      }
    }

    // Add user context if available
    const user = typeof window !== "undefined" ? window.localStorage.getItem("user") : null;
    if (user) {
      try {
        const userData = JSON.parse(user);
        event.user = {
          id: userData.id,
          email: userData.email,
        };
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    return event;
  },

  integrations: [
    Sentry.replayIntegration({
      // Additional SDK configuration for Replay
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
});