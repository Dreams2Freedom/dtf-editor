import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import { Redis } from '@upstash/redis';
import { env } from '@/config/env';

export const maxDuration = 60;
export const runtime = 'nodejs';

/**
 * Preview Cleanup API
 * Deletes preview images and metadata when user navigates away or downloads
 * Can handle single or batch cleanup requests
 */
export async function POST(request: NextRequest) {
  console.log('[Preview Cleanup] Request received');

  try {
    // Initialize Redis
    let redis: Redis | null = null;
    if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
      redis = new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      });
    } else {
      console.warn('[Preview Cleanup] Redis not configured');
      return NextResponse.json(
        { error: 'Cleanup service temporarily unavailable' },
        { status: 503 }
      );
    }

    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Preview Cleanup] Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { previewIds } = body; // Array of preview IDs to cleanup

    if (!previewIds || !Array.isArray(previewIds) || previewIds.length === 0) {
      return NextResponse.json(
        { error: 'previewIds array is required' },
        { status: 400 }
      );
    }

    console.log('[Preview Cleanup] Cleaning up previews:', {
      userId: user.id,
      count: previewIds.length,
    });

    const serviceClient = createServiceRoleClient();
    const results = {
      success: [] as string[],
      failed: [] as string[],
    };

    // Process each preview ID
    for (const previewId of previewIds) {
      try {
        // Get metadata from Redis
        const key = `preview:${user.id}:${previewId}`;
        const metadataStr = await redis.get(key);

        if (!metadataStr) {
          console.warn(
            '[Preview Cleanup] Preview not found in Redis:',
            previewId
          );
          results.failed.push(previewId);
          continue;
        }

        const metadata = JSON.parse(metadataStr as string);

        // Verify ownership (security check)
        if (metadata.userId !== user.id) {
          console.error('[Preview Cleanup] User mismatch:', {
            previewId,
            expected: user.id,
            found: metadata.userId,
          });
          results.failed.push(previewId);
          continue;
        }

        // Delete both files from storage
        const filesToDelete = [metadata.originalPath, metadata.watermarkedPath];

        // Delete original from ai-preview-originals bucket
        const { error: originalDeleteError } = await serviceClient.storage
          .from('ai-preview-originals')
          .remove([metadata.originalPath]);

        if (originalDeleteError) {
          console.error(
            '[Preview Cleanup] Failed to delete original:',
            originalDeleteError
          );
        }

        // Delete watermarked from ai-preview-watermarked bucket
        const { error: watermarkedDeleteError } = await serviceClient.storage
          .from('ai-preview-watermarked')
          .remove([metadata.watermarkedPath]);

        if (watermarkedDeleteError) {
          console.error(
            '[Preview Cleanup] Failed to delete watermarked:',
            watermarkedDeleteError
          );
        }

        // Delete metadata from Redis
        await redis.del(key);

        console.log(
          '[Preview Cleanup] Successfully cleaned up preview:',
          previewId
        );
        results.success.push(previewId);
      } catch (error) {
        console.error(
          '[Preview Cleanup] Error cleaning up preview:',
          previewId,
          error
        );
        results.failed.push(previewId);
      }
    }

    return NextResponse.json({
      success: true,
      cleaned: results.success.length,
      failed: results.failed.length,
      details: results,
    });
  } catch (error: any) {
    console.error('[Preview Cleanup] Unexpected error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
