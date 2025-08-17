import { NextRequest, NextResponse } from 'next/server';
import { captureException } from '@/lib/sentry';

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is disabled in production' },
      { status: 403 }
    );
  }

  try {
    // Simulate an error
    throw new Error('Test server-side error from API route');
  } catch (error) {
    // Capture the error with Sentry
    captureException(error, {
      tags: {
        test: 'true',
        location: 'api',
        endpoint: '/api/test-sentry-error',
      },
      extra: {
        method: request.method,
        url: request.url,
        timestamp: new Date().toISOString(),
      },
      level: 'error',
    });

    return NextResponse.json(
      { error: 'Test error triggered and sent to Sentry' },
      { status: 500 }
    );
  }
}