import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { Redis } from '@upstash/redis';
import { env } from '@/config/env';
import { withRateLimit } from '@/lib/rate-limit';

/**
 * Cleanup Abandoned Previews Cron Job
 * Runs hourly to clean up previews that expired (> 1 hour old)
 * Redis TTL handles most cleanup, but this is a backup to delete storage files
 */
async function handleGet(request: NextRequest) {
  console.log('[Cron: Cleanup Previews] Starting cleanup job');

  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = env.CRON_SECRET || 'your-cron-secret-here';

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron: Cleanup Previews] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize Redis
    let redis: Redis | null = null;
    if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
      redis = new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      });
    } else {
      console.error('[Cron: Cleanup Previews] Redis not configured');
      return NextResponse.json(
        { error: 'Redis not configured' },
        { status: 503 }
      );
    }

    const serviceClient = createServiceRoleClient();
    const now = Date.now();
    const stats = {
      scanned: 0,
      expired: 0,
      deleted: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Scan for all preview keys
    let cursor = '0';
    do {
      const [newCursor, keys] = await redis.scan(cursor, {
        match: 'preview:*',
        count: 100,
      });
      cursor = newCursor;
      stats.scanned += keys.length;

      // Process each preview
      for (const key of keys) {
        try {
          const metadataStr = await redis.get(key);
          if (!metadataStr) {
            // Key already expired or deleted - this is normal due to TTL
            continue;
          }

          const metadata = JSON.parse(metadataStr as string);

          // Check if preview is expired (> 1 hour old)
          if (metadata.expiresAt && metadata.expiresAt < now) {
            stats.expired++;

            // Delete both files from storage
            // Delete original from ai-preview-originals bucket
            const { error: originalDeleteError } = await serviceClient.storage
              .from('ai-preview-originals')
              .remove([metadata.originalPath]);

            if (originalDeleteError) {
              console.error(
                '[Cron: Cleanup Previews] Failed to delete original:',
                originalDeleteError
              );
              stats.failed++;
              stats.errors.push(
                `Failed to delete original: ${metadata.originalPath}`
              );
            }

            // Delete watermarked from ai-preview-watermarked bucket
            const { error: watermarkedDeleteError } =
              await serviceClient.storage
                .from('ai-preview-watermarked')
                .remove([metadata.watermarkedPath]);

            if (watermarkedDeleteError) {
              console.error(
                '[Cron: Cleanup Previews] Failed to delete watermarked:',
                watermarkedDeleteError
              );
              stats.failed++;
              stats.errors.push(
                `Failed to delete watermarked: ${metadata.watermarkedPath}`
              );
            }

            // Delete metadata from Redis
            await redis.del(key);
            stats.deleted++;

            console.log(
              '[Cron: Cleanup Previews] Cleaned up expired preview:',
              {
                userId: metadata.userId,
                previewId: metadata.previewId,
                age:
                  Math.round((now - metadata.createdAt) / 60000) + ' minutes',
              }
            );
          }
        } catch (error: any) {
          console.error(
            '[Cron: Cleanup Previews] Error processing key:',
            key,
            error
          );
          stats.failed++;
          stats.errors.push(`Error processing ${key}: ${error.message}`);
        }
      }
    } while (cursor !== '0');

    console.log('[Cron: Cleanup Previews] Cleanup completed:', stats);

    return NextResponse.json({
      success: true,
      message: 'Preview cleanup completed',
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron: Cleanup Previews] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'api');
