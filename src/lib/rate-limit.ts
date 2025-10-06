import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/config/env';

// Rate limit configurations for different endpoint types
// Designed for production with 1000+ concurrent users
export const RATE_LIMITS = {
  // Authentication endpoints - strict for security
  auth: {
    requests: 5,
    window: '5 m', // 5 requests per 5 minutes (prevent brute force attacks)
  },
  // Admin endpoints - generous for admin operations
  admin: {
    requests: 200,
    window: '1 m', // 200 requests per minute (admins need to work efficiently)
  },
  // Payment endpoints - balanced security and UX
  payment: {
    requests: 30,
    window: '1 m', // 30 requests per minute (shopping cart updates, etc.)
  },
  // File upload endpoints - reasonable for active users
  upload: {
    requests: 20,
    window: '1 m', // 20 uploads per minute (batch processing)
  },
  // Processing endpoints (AI operations) - based on credits anyway
  processing: {
    requests: 50,
    window: '1 m', // 50 requests per minute (credits already limit usage)
  },
  // General API endpoints - generous for smooth UX
  api: {
    requests: 300,
    window: '1 m', // 300 requests per minute (smooth app experience)
  },
  // Public endpoints - very relaxed
  public: {
    requests: 500,
    window: '1 m', // 500 requests per minute (landing pages, etc.)
  },
  // DPI Checker - extra generous (marketing tool)
  dpiChecker: {
    requests: 100,
    window: '1 m', // 100 checks per minute per IP (marketing/conversion tool)
  },
} as const;

// Create Redis client (using in-memory for now, should use Upstash Redis in production)
let redis: Redis | null = null;

// In-memory store for development/testing
class InMemoryRateLimiter {
  private store: Map<string, { count: number; resetAt: number }> = new Map();

  async limit(
    identifier: string,
    requests: number,
    window: string
  ): Promise<{ success: boolean; remaining: number }> {
    const now = Date.now();
    const windowMs = this.parseWindow(window);
    const key = identifier;

    const record = this.store.get(key);

    if (!record || now > record.resetAt) {
      // Create new record
      this.store.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return { success: true, remaining: requests - 1 };
    }

    if (record.count >= requests) {
      return { success: false, remaining: 0 };
    }

    record.count++;
    return { success: true, remaining: requests - record.count };
  }

  private parseWindow(window: string): number {
    const match = window.match(/^(\d+)\s*([smhd])$/);
    if (!match) throw new Error(`Invalid window format: ${window}`);

    const [, num, unit] = match;
    const value = parseInt(num);

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Invalid time unit: ${unit}`);
    }
  }
}

// Initialize rate limiter
let rateLimiter: Ratelimit | InMemoryRateLimiter | null = null;

function getRateLimiter() {
  if (!rateLimiter) {
    // Check if we have Upstash credentials
    if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
      redis = new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      });

      rateLimiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, '1 m'),
        analytics: true,
        prefix: 'dtf-editor',
      });

      console.log('✅ Using Upstash Redis for rate limiting');
    } else {
      // Use in-memory rate limiter for development
      console.warn(
        '⚠️ Using in-memory rate limiter. Configure Upstash Redis for production.'
      );
      console.warn(
        'Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to your environment variables.'
      );
      rateLimiter = new InMemoryRateLimiter();
    }
  }
  return rateLimiter;
}

// Get client identifier from request
export function getClientIdentifier(request: NextRequest): string {
  // Try to get authenticated user ID first
  const userId = request.headers.get('x-user-id');
  if (userId) return `user:${userId}`;

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded
    ? forwarded.split(',')[0]
    : request.headers.get('x-real-ip') || 'unknown';
  return `ip:${ip}`;
}

// Rate limit middleware
export async function rateLimit(
  request: NextRequest,
  type: keyof typeof RATE_LIMITS = 'api'
): Promise<NextResponse | null> {
  try {
    const limiter = getRateLimiter();
    const identifier = getClientIdentifier(request);
    const config = RATE_LIMITS[type];

    let result: {
      success: boolean;
      remaining: number;
      reset?: number;
      limit?: number;
    };

    if (limiter instanceof Ratelimit) {
      const rateLimiter = new Ratelimit({
        redis: redis!,
        limiter: Ratelimit.slidingWindow(config.requests, config.window),
        analytics: true,
        prefix: `dtf-editor:${type}`,
      });

      result = await rateLimiter.limit(identifier);
    } else {
      // In-memory limiter
      result = await limiter.limit(identifier, config.requests, config.window);
    }

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Please try again later.`,
          retryAfter: result.reset || Date.now() + 60000,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(result.limit || config.requests),
            'X-RateLimit-Remaining': String(result.remaining),
            'X-RateLimit-Reset': String(result.reset || Date.now() + 60000),
            'Retry-After': String(
              Math.ceil(
                ((result.reset || Date.now() + 60000) - Date.now()) / 1000
              )
            ),
          },
        }
      );
    }

    // Add rate limit headers to successful responses
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', String(result.limit || config.requests));
    headers.set('X-RateLimit-Remaining', String(result.remaining));
    if (result.reset) {
      headers.set('X-RateLimit-Reset', String(result.reset));
    }

    return null; // Continue to endpoint
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Don't block requests if rate limiting fails
    return null;
  }
}

// Helper to create rate-limited API route handler
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  type: keyof typeof RATE_LIMITS = 'api'
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const rateLimitResponse = await rateLimit(request, type);
    if (rateLimitResponse) return rateLimitResponse;
    return handler(request);
  };
}
