import * as Sentry from '@sentry/nextjs';

/**
 * Capture an exception with additional context
 */
export function captureException(
  error: Error | unknown,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    user?: {
      id?: string;
      email?: string;
      username?: string;
    };
    level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  }
) {
  if (process.env.NODE_ENV === 'development') {
    console.error('Sentry Exception:', error, context);
  }

  Sentry.withScope((scope) => {
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (context?.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    if (context?.user) {
      scope.setUser(context.user);
    }

    if (context?.level) {
      scope.setLevel(context.level);
    }

    Sentry.captureException(error);
  });
}

/**
 * Capture a message with additional context
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    user?: {
      id?: string;
      email?: string;
      username?: string;
    };
  }
) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`Sentry ${level}:`, message, context);
  }

  Sentry.withScope((scope) => {
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (context?.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    if (context?.user) {
      scope.setUser(context.user);
    }

    scope.setLevel(level);
    Sentry.captureMessage(message);
  });
}

/**
 * Track API errors with context
 */
export function trackAPIError(
  endpoint: string,
  error: Error | unknown,
  statusCode?: number,
  userId?: string
) {
  captureException(error, {
    tags: {
      type: 'api_error',
      endpoint,
      ...(statusCode && { status_code: statusCode.toString() }),
    },
    extra: {
      endpoint,
      statusCode,
      timestamp: new Date().toISOString(),
    },
    ...(userId && { user: { id: userId } }),
    level: statusCode && statusCode >= 500 ? 'error' : 'warning',
  });
}

/**
 * Track payment errors
 */
export function trackPaymentError(
  error: Error | unknown,
  context: {
    userId?: string;
    stripeCustomerId?: string;
    amount?: number;
    operation: string;
  }
) {
  captureException(error, {
    tags: {
      type: 'payment_error',
      operation: context.operation,
    },
    extra: {
      ...context,
      timestamp: new Date().toISOString(),
    },
    user: context.userId ? { id: context.userId } : undefined,
    level: 'error',
  });
}

/**
 * Track image processing errors
 */
export function trackProcessingError(
  error: Error | unknown,
  context: {
    userId?: string;
    operation: 'upscale' | 'background-removal' | 'vectorize' | 'generate';
    provider: string;
    fileSize?: number;
  }
) {
  captureException(error, {
    tags: {
      type: 'processing_error',
      operation: context.operation,
      provider: context.provider,
    },
    extra: {
      ...context,
      timestamp: new Date().toISOString(),
    },
    user: context.userId ? { id: context.userId } : undefined,
    level: 'error',
  });
}

/**
 * Track performance issues
 */
export function trackPerformance(
  operation: string,
  duration: number,
  threshold: number
) {
  if (duration > threshold) {
    captureMessage(
      `Performance issue: ${operation} took ${duration}ms (threshold: ${threshold}ms)`,
      'warning',
      {
        tags: {
          type: 'performance',
          operation,
        },
        extra: {
          duration,
          threshold,
          exceeded_by: duration - threshold,
        },
      }
    );
  }
}

/**
 * Set user context for all future events
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  username?: string;
  subscription?: string;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
    ...(user.subscription && { subscription: user.subscription }),
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null);
}