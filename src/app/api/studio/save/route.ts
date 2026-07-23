import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import { saveProcessedImageToGallery } from '@/utils/saveProcessedImage';
import { withRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Studio "Save to gallery" — persistence ONLY.
 *
 * The Studio shell posts the already-finished working image here on Download.
 * Unlike /api/process, this route does NOT re-run any AI operation and does
 * NOT deduct credits — the tools already charged when they produced their
 * results. Re-posting a finished composite to /api/process would re-run the
 * pipeline (double charge / redundant external call), so Studio uses this
 * dedicated save path instead.
 *
 * Two transports:
 *   1. JSON { url, path, operation, provider } — the browser has already
 *      uploaded the full-resolution PNG straight to Supabase Storage and
 *      passes its public URL. This is the primary path: it avoids Vercel's
 *      ~4.5MB request-body limit, which otherwise 413'd large chained
 *      composites (e.g. background-removal → upscale) and surfaced a false
 *      "couldn't save to gallery" error even though intermediate tool saves
 *      had already landed. The staged temp object at `path` is removed after.
 *   2. multipart/form-data { image, operation, provider } — legacy fallback
 *      for small images posted inline.
 */

// Map a Studio tool's `meta.operation` to a value the processed_images
// operation_type CHECK constraint accepts:
// upscale | background-removal | vectorization | generate | color-change |
// halftone. Map a Studio tool's meta.operation onto one of those so the
// gallery tags the composite by the last tool used. Unknown ops fall back to
// 'background-removal'.
function normalizeOperationType(
  raw: string | null
):
  | 'upscale'
  | 'background-removal'
  | 'vectorization'
  | 'color-change'
  | 'halftone' {
  const op = (raw || '').toLowerCase();
  if (op.startsWith('upscale')) return 'upscale';
  if (op.startsWith('vector')) return 'vectorization';
  if (op.startsWith('color')) return 'color-change';
  if (op.startsWith('halftone')) return 'halftone';
  // background_removal, background-removal, background_removal_in_house,
  // studio_composite, and anything else.
  return 'background-removal';
}

async function handlePost(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const contentType = request.headers.get('content-type') || '';

    // ---- Transport 1: JSON with a pre-staged Storage URL (primary) ----
    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => null);
      const url: string | undefined = body?.url;
      // Temp object to clean up. Must live under the caller's own folder so a
      // client can't ask us to delete someone else's object.
      const path: string | undefined = body?.path;
      const operation: string | null = body?.operation ?? null;
      const provider: string | undefined = body?.provider || undefined;
      const fileSize: number =
        typeof body?.fileSize === 'number' ? body.fileSize : 0;

      if (!url || typeof url !== 'string') {
        return NextResponse.json({ error: 'Missing image url' }, { status: 400 });
      }

      const savedId = await saveProcessedImageToGallery({
        userId: user.id,
        // saveProcessedImageToGallery downloads the URL server-side, so there's
        // no large body through the serverless function.
        processedUrl: url,
        operationType: normalizeOperationType(operation),
        originalFilename: 'studio-output.png',
        fileSize,
        provider,
        metadata: {
          source: 'studio',
          studioOperation: operation || 'studio_composite',
          format: 'png',
        },
      });

      // Best-effort cleanup of the staged temp object once we've persisted our
      // own copy under {userId}/processed/. Scoped to the caller's folder.
      if (path && typeof path === 'string' && path.startsWith(`${user.id}/`)) {
        try {
          const serviceClient = createServiceRoleClient();
          await serviceClient.storage.from('images').remove([path]);
        } catch (cleanupErr) {
          console.error(
            '[Studio save] temp cleanup failed (non-fatal):',
            cleanupErr
          );
        }
      }

      if (!savedId) {
        return NextResponse.json(
          { error: 'Failed to save image to gallery' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, savedId });
    }

    // ---- Transport 2: multipart form-data (legacy small-image fallback) ----
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    const operation = formData.get('operation') as string | null;
    const provider = (formData.get('provider') as string) || undefined;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'Missing image file' },
        { status: 400 }
      );
    }

    if (imageFile.type !== 'image/png') {
      return NextResponse.json(
        { error: 'Studio saves PNG output only' },
        { status: 400 }
      );
    }

    const maxSize = 50 * 1024 * 1024;
    if (imageFile.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 50MB' },
        { status: 400 }
      );
    }

    // Build a data URL so saveProcessedImageToGallery can persist it directly
    // (it handles data: URLs and uploads to the 'images' bucket itself).
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;

    const savedId = await saveProcessedImageToGallery({
      userId: user.id,
      processedUrl: dataUrl,
      operationType: normalizeOperationType(operation),
      originalFilename: imageFile.name || 'studio-output.png',
      fileSize: imageFile.size,
      provider,
      metadata: {
        source: 'studio',
        studioOperation: operation || 'studio_composite',
        format: 'png',
      },
    });

    if (!savedId) {
      return NextResponse.json(
        { error: 'Failed to save image to gallery' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, savedId });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handlePost, 'processing');
