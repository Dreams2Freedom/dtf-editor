// This file configures the initialization of Sentry for the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: process.env.NODE_ENV === 'development',
  
  ignoreErrors: [
    // Ignore rate limit errors (handled gracefully)
    "Rate limit exceeded",
    // Ignore expected authentication errors
    "Authentication required",
    "Unauthorized",
    // Ignore ClippingMagic test mode errors
    "test mode",
  ],

  beforeSend(event, hint) {
    // Don't send events for health checks
    if (event.request?.url?.includes("/api/health")) {
      return null;
    }

    // Don't send events for expected 4xx errors
    const status = hint.originalException?.status || event.contexts?.response?.status_code;
    if (status >= 400 && status < 500) {
      // Only send 4xx errors if they're unexpected
      const expectedErrors = [
        "Invalid request",
        "Missing required",
        "Validation error",
        "Bad request",
      ];
      
      const errorMessage = hint.originalException?.message || "";
      if (expectedErrors.some(expected => errorMessage.toLowerCase().includes(expected.toLowerCase()))) {
        return null;
      }
    }

    // Add additional context
    if (event.request) {
      // Remove sensitive headers
      if (event.request.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
        delete event.request.headers["x-api-key"];
      }
      
      // Remove sensitive body data
      if (event.request.data) {
        const sensitiveFields = ["password", "secret", "token", "apiKey", "creditCard"];
        sensitiveFields.forEach(field => {
          if (event.request.data[field]) {
            event.request.data[field] = "[REDACTED]";
          }
        });
      }
    }

    return event;
  },
});