import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { saveProcessedImageToGallery } from '@/utils/saveProcessedImage';
import { withRateLimit } from '@/lib/rate-limit';

/**
 * Studio "Save to gallery" — persistence ONLY.
 *
 * The Studio shell posts the already-finished working image here on Download.
 * Unlike /api/process, this route does NOT re-run any AI operation and does
 * NOT deduct credits — the tools already charged when they produced their
 * results. Re-posting a finished composite to /api/process would re-run the
 * pipeline (double charge / redundant external call), so Studio uses this
 * dedicated save path instead.
 */

// Map a Studio tool's `meta.operation` to a value the processed_images
// operation_type CHECK constraint accepts today
// ('upscale' | 'background-removal' | 'vectorization' | 'generate').
// Client-only edits (color change, halftone) have no dedicated tag yet, so
// they fall back to 'background-removal' (they also produce a transparent
// PNG). Proper tags can be added later via a widening migration.
function normalizeOperationType(
  raw: string | null
): 'upscale' | 'background-removal' | 'vectorization' {
  const op = (raw || '').toLowerCase();
  if (op.startsWith('upscale')) return 'upscale';
  if (op.startsWith('vector')) return 'vectorization';
  // background_removal, background-removal, background_removal_in_house,
  // color_change, halftone, studio_composite, and anything else.
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
