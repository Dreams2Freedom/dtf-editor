import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { saveProcessedImageToGallery } from '@/utils/saveProcessedImage';
import { withRateLimit } from '@/lib/rate-limit';

async function handleGet() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Test with a real Deep-Image URL
    const testUrl =
      'https://deep-image.ai/api/downloadTemporary/67442fba-f36f-4737-93de-6b4c7b80e8e6/3a85962e-b9f2-474f-b1a6-3c85dc723c5e.png';

    console.log('[Test] Calling saveProcessedImageToGallery...');

    const result = await saveProcessedImageToGallery({
      userId: user.id,
      processedUrl: testUrl,
      operationType: 'upscale',
      originalFilename: 'test_function.png',
      metadata: {
        test: true,
        source: 'test-save-function',
      },
    });

    return NextResponse.json({
      success: !!result,
      imageId: result,
      message: result
        ? 'saveProcessedImageToGallery worked!'
        : 'Save failed - check logs',
    });
  } catch (error) {
    console.error('[Test] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGet, 'public');
