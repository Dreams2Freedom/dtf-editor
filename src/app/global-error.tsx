'use client';

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Something went wrong!
            </h2>
            <p className="text-gray-600 mb-4">
              We've encountered an unexpected error. Our team has been notified and is working on a fix.
            </p>
            <div className="flex gap-4">
              <button
                onClick={reset}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Go Home
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 p-4 bg-gray-100 rounded">
                <summary className="cursor-pointer text-sm text-gray-700">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 text-xs overflow-auto">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}