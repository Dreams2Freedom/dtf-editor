import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/rate-limit';
import { requireAdmin } from '@/lib/auth-middleware';
import { Redis } from '@upstash/redis';

async function handleGetStats(request: NextRequest) {
  // Verify admin authentication
  const adminCheck = await requireAdmin(request);
  if (adminCheck) return adminCheck;

  try {
    // Check if Upstash is configured
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return NextResponse.json({
        status: 'not_configured',
        message: 'Upstash Redis not configured. Using in-memory rate limiting.',
        warning: 'In-memory rate limiting does not persist across servers or restarts!',
      });
    }

    // Connect to Redis
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    // Get all rate limit keys
    const keys = await redis.keys('dtf-editor:*');
    
    // Categorize keys
    const stats = {
      total_keys: keys.length,
      by_type: {
        auth: 0,
        admin: 0,
        payment: 0,
        upload: 0,
        processing: 0,
        api: 0,
        public: 0,
        dpiChecker: 0,
      },
      by_identifier: {
        authenticated_users: 0,
        anonymous_ips: 0,
      },
      top_consumers: [] as any[],
      redis_info: {
        db_size: 0,
        memory_usage: 'N/A',
      },
    };

    // Analyze keys
    for (const key of keys) {
      // Parse key format: dtf-editor:type:identifier
      const parts = key.split(':');
      if (parts.length >= 3) {
        const type = parts[1];
        const identifier = parts[2];
        
        // Count by type
        if (type in stats.by_type) {
          stats.by_type[type as keyof typeof stats.by_type]++;
        }
        
        // Count by identifier type
        if (identifier.startsWith('user')) {
          stats.by_identifier.authenticated_users++;
        } else if (identifier.startsWith('ip')) {
          stats.by_identifier.anonymous_ips++;
        }
      }
    }

    // Get top consumers (sample - would need more sophisticated tracking in production)
    const sampleKeys = keys.slice(0, 10);
    for (const key of sampleKeys) {
      try {
        const value = await redis.get(key);
        if (value && typeof value === 'object' && 'count' in value) {
          stats.top_consumers.push({
            key: key.replace('dtf-editor:', ''),
            count: value.count,
            resetAt: value.resetAt,
          });
        }
      } catch (e) {
        // Skip if key expired or invalid
      }
    }

    // Sort top consumers by count
    stats.top_consumers.sort((a, b) => b.count - a.count);
    stats.top_consumers = stats.top_consumers.slice(0, 5);

    // Get database size
    try {
      stats.redis_info.db_size = await redis.dbsize();
    } catch (e) {
      // Some Redis providers might not support this command
    }

    // Calculate estimates
    const estimates = {
      unique_users: Math.floor(stats.by_identifier.authenticated_users),
      unique_visitors: Math.floor(stats.by_identifier.anonymous_ips),
      api_calls_tracked: stats.total_keys * 10, // Rough estimate
      monthly_cost_estimate: `$${(stats.redis_info.db_size * 0.0001).toFixed(2)}`,
    };

    return NextResponse.json({
      status: 'connected',
      stats,
      estimates,
      recommendations: generateRecommendations(stats),
    });

  } catch (error) {
    console.error('Rate limit stats error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get rate limit statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function generateRecommendations(stats: any): string[] {
  const recommendations = [];
  
  if (stats.total_keys > 10000) {
    recommendations.push('Consider implementing key expiration cleanup');
  }
  
  if (stats.by_type.auth > stats.by_type.api) {
    recommendations.push('High auth attempts detected - monitor for potential attacks');
  }
  
  if (stats.by_identifier.anonymous_ips > stats.by_identifier.authenticated_users * 10) {
    recommendations.push('Many anonymous users - consider encouraging sign-ups');
  }
  
  if (stats.top_consumers.some((c: any) => c.count > 50)) {
    recommendations.push('Some users hitting limits frequently - review rate limit thresholds');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Rate limiting is working well - no issues detected');
  }
  
  return recommendations;
}

// Apply rate limiting
export const GET = withRateLimit(handleGetStats, 'admin');